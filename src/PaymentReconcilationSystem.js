import React, { useState, useMemo, useEffect,useRef } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Grid,
  Box,
  Chip,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  ButtonGroup,
  InputLabel
} from '@mui/material';
import { db } from './Firebase';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  where,
  updateDoc,
  doc
} from 'firebase/firestore';
import { format } from 'date-fns';
import CircularProgress from '@mui/material/CircularProgress';
import { deleteDoc } from 'firebase/firestore';
import { useReactToPrint } from 'react-to-print';
import PrintableHistory from './PrintableHistory';

const PaymentReconciliationSystem = () => {
  
  // State management
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0], // Default to current date
    paymentMethod: '',
  });

  const paymentMethods = [
    'Cash',
    'Kpay',
    'WavePay',
    'Bank Transfer',
  ];
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });
  const contentRef = useRef(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // Fetch customers and their data from Firestore
  useEffect(() => {
    // Fetch customers
    const customersRef = collection(db, 'customers');
    const unsubscribeCustomers = onSnapshot(customersRef, (snapshot) => {
      const customerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customerData);
    });

    return () => unsubscribeCustomers();
  }, []);

  // Handle customer selection and fetch related orders/payments
  const handleCustomerChange = async (event) => {
    const customerId = event.target.value;
    setSelectedCustomer(customerId);
    setIsLoading(true);

    if (customerId) {
      // Fetch orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('customerId', '==', customerId)
      );
      
      const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const updatedOrders = [...ordersData].sort((a, b) => new Date(a.date) - new Date(b.date));
        setOrders(updatedOrders);
        setIsLoading(false);
      });

      // Fetch payments
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('customerId', '==', customerId)
      );
      
      const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
        const paymentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPayments(paymentsData);
      });

      return () => {
        unsubscribeOrders();
        unsubscribePayments();
      };
    } else {
      setOrders([]);
      setPayments([]);
      setIsLoading(false);
    }
  };

  // Modified allocatePayment to update Firestore
  const allocatePayment = async (paymentAmount, paymentId) => {
    let remainingPayment = paymentAmount;
    const updatedOrders = [...orders].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let order of updatedOrders) {
      if (order.status === 'unpaid' && remainingPayment > 0) {
        const unpaidAmount = order.amount - order.paidAmount;
        const allocation = Math.min(remainingPayment, unpaidAmount);
        
        order.paidAmount += allocation;
        remainingPayment -= allocation;
        
        if (order.paidAmount >= order.amount) {
          order.status = 'paid';
        }

        // Update order in Firestore
        await updateDoc(doc(db, 'orders', order.id), {
          paidAmount: order.paidAmount,
          status: order.status
        });
      }
    }
    
    setOrders(updatedOrders);
    return remainingPayment;
  };

  // Modified handleAddPayment to save to Firestore
  const handleAddPayment = async () => {
    if (!newPayment.amount || !selectedCustomer || !newPayment.paymentMethod || !newPayment.date) return;

    const paymentToAdd = {
      customerId: selectedCustomer,
      date: newPayment.date,
      amount: parseFloat(newPayment.amount),
      description: newPayment.description,
      paymentMethod: newPayment.paymentMethod,
      createdAt: new Date().toISOString(),
      transactionId:`${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`
    };

    try {
      // Add payment to Firestore
      const paymentRef = await addDoc(collection(db, 'payments'), paymentToAdd);
      const unallocated = await allocatePayment(paymentToAdd.amount, paymentRef.id);

      // Update payment with unallocated amount
      await updateDoc(paymentRef, {
        allocated: true,
        unallocatedAmount: unallocated
      });

      setIsPaymentFormOpen(false);
      setNewPayment({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: '',
      });
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;
    
    try {
      // First, reset all affected orders to unpaid status and clear paid amounts
      const affectedOrders = orders.filter(order => order.paidAmount > 0);
      for (let order of affectedOrders) {
        await updateDoc(doc(db, 'orders', order.id), {
          paidAmount: 0,
          status: 'unpaid'
        });
      }
  
      // Delete the payment
      await deleteDoc(doc(db, 'payments', selectedPayment.id));
  
      // Re-allocate remaining payments
      const remainingPayments = payments.filter(p => p.id !== selectedPayment.id)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      for (let payment of remainingPayments) {
        const unallocated = await allocatePayment(payment.amount, payment.id);
        await updateDoc(doc(db, 'payments', payment.id), {
          allocated: true,
          unallocatedAmount: unallocated
        });
      }
  
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };
  
  const handleEditPayment = async () => {
    if (!selectedPayment) return;
  
    try {
      // First, reset all affected orders to unpaid status and clear paid amounts
      const affectedOrders = orders.filter(order => order.paidAmount > 0);
      for (let order of affectedOrders) {
        await updateDoc(doc(db, 'orders', order.id), {
          paidAmount: 0,
          status: 'unpaid'
        });
      }
  
      // Update the payment in Firestore
      await updateDoc(doc(db, 'payments', selectedPayment.id), {
        date: selectedPayment.date,
        description: selectedPayment.description,
        paymentMethod: selectedPayment.paymentMethod,
        amount: parseFloat(selectedPayment.amount),
        unallocatedAmount: 0 // Reset unallocated amount
      });
  
      // Re-allocate the updated payment
      const unallocated = await allocatePayment(
        parseFloat(selectedPayment.amount),
        selectedPayment.id
      );
  
      // Update payment with new unallocated amount
      await updateDoc(doc(db, 'payments', selectedPayment.id), {
        allocated: true,
        unallocatedAmount: unallocated
      });
  
      setIsEditFormOpen(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  // Calculate totals and balances (unchanged)
  const calculations = useMemo(() => {
    const totalOrders = orders.reduce((sum, order) => sum + order.amount, 0);
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPaid = orders.reduce((sum, order) => sum + order.paidAmount, 0);
    const remainingBalance = totalOrders - totalPaid;

    return {
      totalOrders,
      totalPayments,
      totalPaid,
      remainingBalance
    };
  }, [orders, payments]);

  const filteredOrders = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return orders;
    return orders.filter(order => {
      const orderDate = new Date(order.date);
      return orderDate >= new Date(dateRange.startDate) && 
             orderDate <= new Date(dateRange.endDate);
    });
  }, [orders, dateRange]);

  const filteredPayments = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return payments;
    return payments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate >= new Date(dateRange.startDate) && 
             paymentDate <= new Date(dateRange.endDate);
    });
  }, [payments, dateRange]);

  // Prepare statement data for printing
  const statementData = useMemo(() => {
    if (!selectedCustomer) return null;
    
    const customer = customers.find(c => c.id === selectedCustomer);
    const totals = {
      totalOrders: filteredOrders.reduce((sum, order) => sum + order.amount, 0),
      totalPayments: filteredPayments.reduce((sum, payment) => sum + payment.amount, 0),
      totalPaid: filteredOrders.reduce((sum, order) => sum + order.paidAmount, 0),
      remainingBalance: filteredOrders.reduce((sum, order) => sum + (order.amount - order.paidAmount), 0),
    };

    return {
      customer: customer?.name || 'Unknown Customer',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      orders: filteredOrders,
      payments: filteredPayments,
      totals: totals,
    };
  }, [filteredOrders, filteredPayments, customers, selectedCustomer, dateRange]);


  // Reset date range
  const handleResetDateRange = () => {
    setDateRange({ startDate: new Date(), endDate: new Date() });
  };

  return (
    <Paper elevation={0} sx={{ p: 3, maxWidth: 'xl', mx: 'auto',border:'1px solid #ccc' }}>
      {/* Customer Selection */}
      <Box sx={{ mb: 4 }}>
        <FormControl fullWidth>
          <InputLabel>Select Customer</InputLabel>
          <Select
            value={selectedCustomer}
            onChange={handleCustomerChange}
            label="Select Customer"
          >
            <MenuItem value="">
              <em>Select a customer</em>
            </MenuItem>
            {customers.map((customer) => (
              <MenuItem key={customer.id} value={customer.id}>
                {customer.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {selectedCustomer && (
        <>
        {/* Date Range Selection */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Start Date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
            <TextField
              label="End Date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
            <ButtonGroup>
              <Button 
                variant="contained" 
                onClick={reactToPrintFn}
                disabled={!dateRange.startDate || !dateRange.endDate}
              >
                Print Statement
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleResetDateRange}
              >
                Reset Dates
              </Button>
            </ButtonGroup>
          </Box>

          {/* Hidden Printable Component */}
            <Box sx={{ display: 'none' }}>
                {statementData && <PrintableHistory statementData={statementData} ref={contentRef}/>}
                </Box>
          
          {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
          
          {/* Summary Section */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Orders Value
                </Typography>
                <Typography variant="h6">
                  {calculations.totalOrders.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Payments Received
                </Typography>
                <Typography variant="h6">
                  {calculations.totalPayments.toLocaleString()}
                </Typography>
              </Grid>
             
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Remaining Balance
                </Typography>
                <Typography variant="h6" color="error.main">
                  {calculations.remainingBalance.toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Orders Table */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{display:'flex',justifyContent:'flex-start'}}gutterBottom>
              Orders History
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Paid Amount</TableCell>
                    <TableCell align="right">Remaining</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{format(new Date(order.date),"dd-MM-yyyy")}</TableCell>
                      <TableCell align="right">{order.amount.toLocaleString()}</TableCell>
                      <TableCell align="right">{order.paidAmount.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {(order.amount - order.paidAmount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status}
                          color={order.status === 'paid' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Payments Table */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Payment History
              </Typography>
              <Box>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => setIsPaymentFormOpen(true)}
                sx={{ mr: 1 }}
              >
                Add Payment
              </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeletePayment}
              disabled={!selectedPayment}
            >
              Delete
            </Button>
            </Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Payment Method</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Unallocated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                {payments.map((payment) => (
                  <TableRow
                    key={payment.id}
                    hover
                    onClick={() => setSelectedPayment(payment)}
                    selected={selectedPayment?.id === payment.id}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{format(new Date(payment.date), "dd-MM-yyyy")}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell align="right">{payment.amount.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      {payment.unallocatedAmount || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </TableContainer>
          </Box>
          </>
          )}
        </>
      )}

      {/* Payment Form Dialog */}
      <Dialog 
        open={isPaymentFormOpen} 
        onClose={() => setIsPaymentFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Date"
            type="date"
            value={newPayment.date}
            onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
            fullWidth
            required
            InputLabelProps={{
              shrink: true,
            }}
          />
           
            <TextField
              label="Description"
              value={newPayment.description}
              onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
              fullWidth
            />
            <FormControl fullWidth required>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={newPayment.paymentMethod}
              onChange={(e) => setNewPayment({...newPayment, paymentMethod: e.target.value})}
              label="Payment Method"
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method} value={method}>
                  {method}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
              label="Amount"
              type="number"
              value={newPayment.amount}
              onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentFormOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddPayment}
            variant="contained"
            color="primary"
          >
            Add Payment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
      open={isEditFormOpen}
      onClose={() => setIsEditFormOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Edit Payment</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Date"
            type="date"
            value={selectedPayment?.date || ''}
            onChange={(e) => setSelectedPayment({...selectedPayment, date: e.target.value})}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Description"
            value={selectedPayment?.description || ''}
            onChange={(e) => setSelectedPayment({...selectedPayment, description: e.target.value})}
            fullWidth
          />
          <FormControl fullWidth required>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={selectedPayment?.paymentMethod || ''}
              onChange={(e) => setSelectedPayment({...selectedPayment, paymentMethod: e.target.value})}
              label="Payment Method"
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method} value={method}>
                  {method}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Amount"
            type="number"
            value={selectedPayment?.amount || ''}
            onChange={(e) => setSelectedPayment({...selectedPayment, amount: e.target.value})}
            fullWidth
            required
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setIsEditFormOpen(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleEditPayment}
          variant="contained"
          color="primary"
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
    </Paper>
  );
};

export default PaymentReconciliationSystem;