import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Container,
  IconButton,
  Stack,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  TableContainer,
  Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { db } from './Firebase';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  where,
  addDoc
} from 'firebase/firestore';
import { TablePagination } from '@mui/material';
import {format} from 'date-fns';


const OrdersTable = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formNumbers, setFormNumbers] = useState(['']);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    date: '',
    customerName: '',
    itemName: '',
    description: '',
    formType: '',
    quantity: 0,
    price: 0,
    amount: 0,
    gateName: '',
    formNumber: [],
    payees: [
      { payeeName: '', costPrice: 0, quantity: 0, costAmount: 0 },
      { payeeName: '', costPrice: 0, quantity: 0, costAmount: 0 },
    ],
  });
  const [payeeNames, setPayeeNames] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Fetch orders from Firestore
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersCollection = collection(db, 'orders');
        const q = query(ordersCollection, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure formNumber is always an array
          formNumber: doc.data().formNumber || [],
          // Convert Firestore timestamp to string if it exists
          date: doc.data().date || '',
          processingDate: doc.data().processingDate || '',
          completionDate: doc.data().completionDate || ''
        }));
        
        setOrders(ordersData);

        // Fetch payee names
        const payeeSnapshot = await getDocs(collection(db, 'payees'));
        const allPayeeNames = payeeSnapshot.docs.map((doc) => doc.data().payeeName);
        const uniquePayeeNames = [...new Set(allPayeeNames)]
          .filter(Boolean)
          .map((name) => ({ name }));
        setPayeeNames(uniquePayeeNames);
      } catch (error) {
        console.error("Error fetching orders: ", error);
        setSnackbar({
          open: true,
          message: `Error loading orders: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleOpenEditDialog = (order) => {
    setSelectedOrder(order);
    setEditFormData({
      id: order.id,
      date: order.date,
      customerName: order.customerName || '',
      itemName: order.itemName || '',
      description: order.description || '',
      formType: order.formType || '',
      quantity: order.quantity || 0,
      price: order.price || 0,
      amount: order.amount || 0,
      gateName: order.gateName || '',
      formNumber: order.formNumber || [],
      payees: order.payees && order.payees.length > 0
        ? order.payees.map((payee) => ({
            id: payee.id,
            payeeName: payee.payeeName || '',
            costPrice: payee.costPrice || 0,
            quantity: payee.quantity || 0,
            costAmount: payee.costAmount || 0,
          }))
        : [
            { payeeName: '', costPrice: 0, quantity: 0, costAmount: 0 },
            { payeeName: '', costPrice: 0, quantity: 0, costAmount: 0 },
          ],
    });
    setIsEditDialogOpen(true);
  };
  
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedOrder(null);
  };
  
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    
    // Update amount when quantity or price changes
    if (name === 'quantity' || name === 'price') {
      const newData = { ...editFormData, [name]: value };
      const quantity = parseFloat(name === 'quantity' ? value : editFormData.quantity) || 0;
      const price = parseFloat(name === 'price' ? value : editFormData.price) || 0;
      
      setEditFormData({
        ...newData,
        amount: (quantity * price).toFixed(0),
      });
    } else {
      setEditFormData({
        ...editFormData,
        [name]: value
      });
    }
  };
  
  const handlePayeeChange = (index, field, value) => {
    const newPayees = [...editFormData.payees];
    newPayees[index] = { ...newPayees[index], [field]: value };
    
    if (field === 'costPrice' || field === 'quantity') {
      const costPrice = parseFloat(newPayees[index].costPrice) || 0;
      const quantity = parseFloat(newPayees[index].quantity) || 0;
      newPayees[index].costAmount = (costPrice * quantity).toFixed(0);
    }
    
    setEditFormData({ ...editFormData, payees: newPayees });
  };

  const handleAddPayee = () => {
    setEditFormData({
      ...editFormData,
      payees: [
        ...editFormData.payees,
        { payeeName: '', costPrice: 0, quantity: 0, costAmount: 0 },
      ],
    });
  };

  const handleRemovePayee = (index) => {
    const newPayees = editFormData.payees.filter((_, i) => i !== index);
    setEditFormData({ ...editFormData, payees: newPayees });
  };

  const handleEditFormSubmit = async () => {
    if (selectedOrder) {
      setLoading(true);
      try {
        const orderRef = doc(db, 'orders', selectedOrder.id);
        
        // Calculate totalPayeeCost
        const totalPayeeCost = editFormData.payees.reduce((total, payee) => {
          if (payee.payeeName && payee.costPrice && payee.quantity) {
            const costPrice = parseFloat(payee.costPrice) || 0;
            const quantity = parseFloat(payee.quantity) || 0;
            return total + (costPrice * quantity);
          }
          return total;
        }, 0);

        // Prepare order data
        const updateData = {
          ...editFormData,
          quantity: parseFloat(editFormData.quantity) || 0,
          price: parseFloat(editFormData.price) || 0,
          amount: parseFloat(editFormData.amount) || 0,
          totalPayeeCost,
        };
        
        // Remove id and payees from order update (payees are stored separately)
        const { id, payees, ...dataToUpdate } = updateData;
        
        // Update order in Firestore
        await updateDoc(orderRef, dataToUpdate);

        // Update payee data
        // First, delete existing payees for this order
        const payeesQuery = query(
          collection(db, 'payees'),
          where('orderId', '==', selectedOrder.id)
        );
        const payeesSnapshot = await getDocs(payeesQuery);
        for (const payeeDoc of payeesSnapshot.docs) {
          await deleteDoc(doc(db, 'payees', payeeDoc.id));
        }

        // Add new payees
        for (const payee of editFormData.payees) {
          if (payee.payeeName && payee.costPrice && payee.quantity) {
            await addDoc(collection(db, 'payees'), {
              orderId: selectedOrder.id,
              payeeName: payee.payeeName,
              costPrice: parseFloat(payee.costPrice) || 0,
              quantity: parseFloat(payee.quantity) || 0,
              costAmount: parseFloat(payee.costAmount) || 0,
              createdAt: serverTimestamp(),
              status: 'unpaid',
              paidAmount: 0,
              orderDate: editFormData.date,
            });
          }
        }

        // Update local state
        setOrders(
          orders.map((order) =>
            order.id === selectedOrder.id
              ? { ...updateData, id: selectedOrder.id, payees: editFormData.payees }
              : order
          )
        );

        // Update payeeNames if new payees were added
        const newPayeeNames = editFormData.payees
          .map((payee) => payee.payeeName)
          .filter((name) => name && !payeeNames.some((p) => p.name === name));
        if (newPayeeNames.length > 0) {
          setPayeeNames([
            ...payeeNames,
            ...newPayeeNames.map((name) => ({ name })),
          ]);
        }
        
        setSnackbar({
          open: true,
          message: 'Order updated successfully!',
          severity: 'success',
        });
        
        handleCloseEditDialog();
      } catch (error) {
        console.error('Error updating order: ', error);
        setSnackbar({
          open: true,
          message: `Error updating order: ${error.message}`,
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Dialog handlers
  const handleOpenDialog = (order) => {
    setSelectedOrder(order);
    setFormNumbers(order.formNumber && order.formNumber.length ? order.formNumber : ['']);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedOrder(null);
    setFormNumbers(['']);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSubmitFormNumber = async () => {
    if (selectedOrder && formNumbers.some(num => num.trim() !== '')) {
      setLoading(true);
      setDuplicateWarning(''); // Reset warning
      
      try {
        // Get all existing form numbers from Firestore
        const ordersCollection = collection(db, 'orders');
        const querySnapshot = await getDocs(ordersCollection);
        
        // Collect all existing form numbers
        const allFormNumbers = new Set();
        querySnapshot.docs.forEach(doc => {
          if (doc.id !== selectedOrder.id) { // Exclude current order
            const formNums = doc.data().formNumber || [];
            formNums.forEach(num => allFormNumbers.add(num.trim()));
          }
        });
  
        // Check for duplicates
        const validFormNumbers = formNumbers.filter(num => num.trim() !== '');
        const duplicates = validFormNumbers.filter(num => allFormNumbers.has(num));
        
        if (duplicates.length > 0) {
          setDuplicateWarning(`The following form numbers are already in use: ${duplicates.join(', ')}`);
          setLoading(false);
          return;
        }
  
        // Proceed with update if no duplicates
        const orderRef = doc(db, 'orders', selectedOrder.id);
        await updateDoc(orderRef, {
          formNumber: validFormNumbers
        });
        
        // Update local state
        setOrders(orders.map(order => {
          if (order.id === selectedOrder.id) {
            return { 
              ...order, 
              formNumber: validFormNumbers
            };
          }
          return order;
        }));
        
        setSnackbar({
          open: true,
          message: 'Form numbers updated successfully!',
          severity: 'success'
        });
        
        handleCloseDialog();
      } catch (error) {
        console.error("Error updating form numbers: ", error);
        setSnackbar({
          open: true,
          message: `Error updating form numbers: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddFormNumber = () => {
    setFormNumbers([...formNumbers, '']);
  };

  // Handle removing form number field
  const handleRemoveFormNumber = (index) => {
    const newFormNumbers = formNumbers.filter((_, i) => i !== index);
    setFormNumbers(newFormNumbers);
  };

  // Handle form number change
  const handleFormNumberChange = (index, value) => {
    const newFormNumbers = [...formNumbers];
    newFormNumbers[index] = value;
    setFormNumbers(newFormNumbers);
  };

  // Handle edit order
  const handleEditOrder = (order) => {
    handleOpenEditDialog(order);
  };

  const handleOpenDeleteDialog = (order) => {
    setSelectedOrder(order);
    setIsDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedOrder(null);
  };

  // Handle delete order
  const handleDeleteOrder = async () => {
  setLoading(true);
  try {
    const orderRef = doc(db, 'orders', selectedOrder.id);
    await deleteDoc(orderRef);
    
    setOrders(orders.filter(order => order.id !== selectedOrder.id));
    
    setSnackbar({
      open: true,
      message: 'Order deleted successfully!',
      severity: 'success'
    });
    
    handleCloseDeleteDialog();
  } catch (error) {
    console.error("Error deleting order: ", error);
    setSnackbar({
      open: true,
      message: `Error deleting order: ${error.message}`,
      severity: 'error'
    });
  } finally {
    setLoading(false);
  }
};

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Filter orders based on search term
  const filteredOrders = orders.filter(order => 
    Object.values(order).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  
  const renderEditDialog = () => (
    <Dialog open={isEditDialogOpen} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
      <DialogTitle>Edit Order</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Date"
            name="date"
            type="date"
            fullWidth
            variant="outlined"
            value={editFormData.date}
            onChange={handleEditFormChange}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Customer Name"
            name="customerName"
            type="text"
            fullWidth
            variant="outlined"
            value={editFormData.customerName}
            onChange={handleEditFormChange}
          />
          <TextField
            label="Item Name"
            name="itemName"
            type="text"
            fullWidth
            variant="outlined"
            value={editFormData.itemName}
            onChange={handleEditFormChange}
          />
          <TextField
            label="Description"
            name="description"
            type="text"
            fullWidth
            variant="outlined"
            value={editFormData.description}
            onChange={handleEditFormChange}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel id="form-type-label">Form Type</InputLabel>
            <Select
              labelId="form-type-label"
              id="form-type"
              name="formType"
              value={editFormData.formType}
              onChange={handleEditFormChange}
              label="Form Type"
            >
              <MenuItem value="Form-E">Form E</MenuItem>
              <MenuItem value="Phyto">Phyto</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Gate Name"
            name="gateName"
            type="text"
            fullWidth
            variant="outlined"
            value={editFormData.gateName}
            onChange={handleEditFormChange}
          />
          <TextField
            label="Quantity"
            name="quantity"
            type="number"
            fullWidth
            variant="outlined"
            value={editFormData.quantity}
            onChange={handleEditFormChange}
          />
          <TextField
            label="Price"
            name="price"
            type="number"
            fullWidth
            variant="outlined"
            value={editFormData.price}
            onChange={handleEditFormChange}
          />
          <TextField
            label="Amount"
            name="amount"
            type="number"
            fullWidth
            variant="outlined"
            value={editFormData.amount}
            InputProps={{ readOnly: true }}
          />
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Payee Details
          </Typography>
          {editFormData.payees.map((payee, index) => (
            <Box key={index} sx={{ mb: 2, border: '1px solid #eee', p: 2, borderRadius: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Autocomplete
                  options={payeeNames}
                  getOptionLabel={(option) => option.name || ''}
                  value={payeeNames.find((p) => p.name === payee.payeeName) || null}
                  onChange={(event, newValue) =>
                    handlePayeeChange(index, 'payeeName', newValue?.name || '')
                  }
                  inputValue={payee.payeeName}
                  onInputChange={(event, newInputValue) => {
                    handlePayeeChange(index, 'payeeName', newInputValue);
                  }}
                  freeSolo
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={`Payee ${index + 1} Name`}
                      fullWidth
                      sx={{ minWidth: 200 }}
                    />
                  )}
                />
                <TextField
                  label="Cost Price"
                  type="number"
                  value={payee.costPrice}
                  onChange={(e) => handlePayeeChange(index, 'costPrice', e.target.value)}
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Quantity"
                  type="number"
                  value={payee.quantity}
                  onChange={(e) => handlePayeeChange(index, 'quantity', e.target.value)}
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Cost Amount"
                  type="number"
                  value={payee.costAmount}
                  InputProps={{ readOnly: true }}
                  sx={{ width: 150 }}
                />
                <IconButton
                  onClick={() => handleRemovePayee(index)}
                  color="error"
                  disabled={editFormData.payees.length <= 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddPayee}
            variant="outlined"
            size="small"
          >
            Add Payee
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseEditDialog} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleEditFormSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Modified Dialog content
  const renderDialog = () => (
    <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
      <DialogTitle>Enter Form Numbers</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formNumbers.map((formNum, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                autoFocus={index === 0}
                label={`Form Number ${index + 1}`}
                type="text"
                fullWidth
                variant="outlined"
                value={formNum}
                onChange={(e) => handleFormNumberChange(index, e.target.value)}
              />
              {index > 0 && (
                <IconButton
                  size="small"
                  onClick={() => handleRemoveFormNumber(index)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}
          {duplicateWarning && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {duplicateWarning}
            </Alert>
          )}
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddFormNumber}
            variant="outlined"
            size="small"
          >
            Add Form Number
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmitFormNumber}
          variant="contained"
          color="primary"
          disabled={formNumbers.every(num => num.trim() === '') || loading}
        >
          {loading ? 'Saving...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderDeleteDialog = () => (
    <Dialog
      open={isDeleteDialogOpen}
      onClose={handleCloseDeleteDialog}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {"Confirm Delete"}
      </DialogTitle>
      <DialogContent>
        <Typography id="alert-dialog-description">
          Are you sure you want to delete this order? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDeleteDialog} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleDeleteOrder}
          color="error"
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Paper elevation={0} sx={{ p: 3, maxWidth: 'xl', mx: 'auto', border: '1px solid #ccc' }}>
      <Typography
        variant="h4"
        component="h1"
        mb={3}
        sx={{
          fontWeight: 'bold',
          fontSize: { xs: '1.5rem', sm: '2.125rem' },
        }}
      >
        Orders List
      </Typography>
      {/* Search and Buttons */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'column' },
          gap: 2,
          width: { xs: '100%', sm: 'auto' },
        }}
        mb={3}
      >
        <TextField
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          variant="outlined"
          sx={{
            minWidth: { xs: '100%', sm: 250 },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          }}
        >
          {[
            { icon: <AddIcon />, label: 'Add Form Numbers', onClick: handleOpenDialog, color: 'primary' },
            { icon: <EditIcon />, label: 'Edit Order', onClick: handleEditOrder, color: 'primary' },
            { icon: <DeleteIcon />, label: 'Delete Order', onClick: handleOpenDeleteDialog, color: 'error' },
          ].map((btn, index) => (
            <Button
              key={index}
              startIcon={btn.icon}
              onClick={() => {
                const selectedOrder = orders.find((order) => order.id === selectedOrderId);
                if (selectedOrder) btn.onClick(selectedOrder);
              }}
              variant="outlined"
              color={btn.color}
              disabled={!selectedOrderId || (btn.label === 'Delete Order' && loading)}
              sx={{
                minWidth: { xs: 120, sm: 'auto' },
              }}
            >
              {btn.label}
            </Button>
          ))}
        </Box>
      </Box>
      {/* Table Section */}
      <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden' }}>
        {loading && orders.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader sx={{ minWidth: { xs: 650, md: 1200 } }}>
              <TableHead>
                <TableRow>
                  {[
                    'Date',
                    'Customer',
                    'Item',
                    'Description',
                    'Form Type',
                    'Qty',
                    'Price',
                    'Amount',
                    'Form Numbers',
                  ].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        backgroundColor: 'grey.100',
                        fontWeight: 'bold',
                        py: 2,
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((order) => (
                      <TableRow
                        key={order.id}
                        hover
                        onClick={() => setSelectedOrderId(order.id)}
                        selected={selectedOrderId === order.id}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'grey.50' },
                        }}
                      >
                        <TableCell>{format(new Date(order.date), 'dd-MM-yyyy')}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{order.itemName}</TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 200,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {order.description}
                        </TableCell>
                        <TableCell>{order.formType}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>{order.price?.toLocaleString()}</TableCell>
                        <TableCell>{order.amount?.toLocaleString()}</TableCell>
                        <TableCell>
                          {Array.isArray(order.formNumber)
                            ? order.formNumber.join(', ')
                            : order.formNumber}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No orders found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredOrders.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                '.MuiTablePagination-toolbar': {
                  py: 1,
                },
              }}
            />
          </TableContainer>
        )}
      </Paper>
      {/* Dialogs and Snackbar */}
      {renderDialog()}
      {renderEditDialog()}
      {renderDeleteDialog()}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: '8px' }}
          elevation={6}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default OrdersTable;