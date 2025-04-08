import React, { useState, useEffect } from 'react';
import { 
  Button, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Box, 
  Snackbar, Alert, Paper, Modal, Typography, IconButton, Autocomplete
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './Firebase';

const DataEntryForm = () => {
  const [formData, setFormData] = useState({
    date: '', itemName: '', description: '', formType: '', quantity: 1, 
    price: 0, amount: 0, costPrice: 0,costAmount:0, gateName: '', customerId: '' // Added 'cost' here
  });
  
  const [customers, setCustomers] = useState([]);
  const [itemNames, setItemNames] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [gateNames, setGateNames] = useState([]);

  // Fetch customers and item names on component mount (unchanged)
  useEffect(() => {
    const fetchData = async () => {
      const customerSnapshot = await getDocs(collection(db, 'customers'));
      const customerList = customerSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setCustomers(customerList);

      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const allItemNames = ordersSnapshot.docs.map(doc => doc.data().itemName);
      const uniqueItemNames = [...new Set(allItemNames)].map(name => ({ name }));
      setItemNames(uniqueItemNames);

      const allGateNames = ordersSnapshot.docs.map(doc => doc.data().gateName)
        .filter(name => name);
      const uniqueGateNames = [...new Set(allGateNames)].map(name => ({ name }));
      setGateNames(uniqueGateNames);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.itemName || !formData.formType || !formData.customerId) {
      setSnackbar({ open: true, message: 'Please fill out all required fields', severity: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const orderData = {
        ...formData,
        customerName: customers.find(c => c.id === formData.customerId)?.name || '',
        quantity: formData.quantity ? parseFloat(formData.quantity) : 0,
        price: formData.price ? parseFloat(formData.price) : 0,
        amount: formData.amount ? parseFloat(formData.amount) : 0,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : 0, // Added 'cost' to orderData
        costAmount: formData.costAmount ? parseFloat(formData.costAmount) : 0, // Added 'cost' to orderData
        createdAt: serverTimestamp(),
        status: 'unpaid',
        paidAmount: 0,
        orderId: `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`
      };
      
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      if (!itemNames.some(item => item.name === formData.itemName)) {
        setItemNames([...itemNames, { name: formData.itemName }]);
      }

      if (formData.gateName && !gateNames.some(gate => gate.name === formData.gateName)) {
        setGateNames([...gateNames, { name: formData.gateName }]);
      }
      
      setSnackbar({ open: true, message: 'Order saved successfully!', severity: 'success' });
      handleClear();
    } catch (error) {
      setSnackbar({ open: true, message: `Error saving order: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    if (field === 'price' || field === 'quantity' || field === 'costPrice') {
      const price = parseFloat(newData.price) || 0;
      const costprice = parseFloat(newData.costPrice) || 0;
      const quantity = parseFloat(newData.quantity) || 0;
      newData.amount = (price * quantity).toFixed(0); // Amount still calculated from price * quantity
      newData.costAmount = (parseFloat(newData.costPrice) * quantity).toFixed(0); // Added 'cost' calculation
    }
    setFormData(newData);
  };

  const handleClear = () => {
    setFormData({
      date: '', itemName: '', description: '', formType: '', quantity: '', 
      price: '', amount: '', costPrice: '', costAmount:'',gateName: '', customerId: '' // Added 'cost' to clear
    });
  };

  // Customer management functions (unchanged)
  const handleAddCustomer = async () => {
    if (!newCustomer) return;
    try {
      const docRef = await addDoc(collection(db, 'customers'), { name: newCustomer, createdAt: serverTimestamp() });
      setCustomers([...customers, { id: docRef.id, name: newCustomer }]);
      setNewCustomer('');
      setOpenModal(false);
      setSnackbar({ open: true, message: 'Customer added successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    }
  };

  const handleEditCustomer = async (customer) => {
    try {
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, { name: newCustomer });
      setCustomers(customers.map(c => c.id === customer.id ? { ...c, name: newCustomer } : c));
      setEditingCustomer(null);
      setNewCustomer('');
      setSnackbar({ open: true, message: 'Customer updated successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await deleteDoc(doc(db, 'customers', id));
      setCustomers(customers.filter(c => c.id !== id));
      setSnackbar({ open: true, message: 'Customer deleted successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, maxWidth: 'xl', mx: 'auto', border:'1px solid #ccc' }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Customer Selection (unchanged) */}
          <Grid item xs={12} md={8}>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => option.name}
              value={customers.find(c => c.id === formData.customerId) || null}
              onChange={(e, newValue) => handleChange('customerId', newValue?.id || '')}
              renderInput={(params) => (
                <TextField {...params} label="Customer Name" required fullWidth />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={() => setOpenModal(true)}
              fullWidth
              sx={{ height: '100%' }}
            >
              Add New Customer
            </Button>
          </Grid>

          {/* Date and Item Name (unchanged) */}
          <Grid item xs={12} sm={6} lg={4}>
            <TextField
              required
              fullWidth
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={8}>
            <Autocomplete
              options={itemNames}
              getOptionLabel={(option) => option.name}
              value={itemNames.find(item => item.name === formData.itemName) || null}
              onChange={(e, newValue) => handleChange('itemName', newValue?.name || '')}
              freeSolo
              renderInput={(params) => (
                <TextField {...params} label="Item Name" required fullWidth />
              )}
            />
          </Grid>

          {/* Description (unchanged) */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={1}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </Grid>

          {/* Form Type and Gate Name (unchanged) */}
          <Grid item xs={12} sm={6} lg={4}>
            <FormControl fullWidth required>
              <InputLabel>Form Type</InputLabel>
              <Select
                value={formData.formType}
                label="Form Type"
                onChange={(e) => handleChange('formType', e.target.value)}
              >
                <MenuItem value="Form-E">Form E</MenuItem>
                <MenuItem value="Phyto">Phyto</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} lg={8}>
            <Autocomplete
              options={gateNames}
              getOptionLabel={(option) => option.name}
              value={gateNames.find(gate => gate.name === formData.gateName) || null}
              onChange={(e, newValue) => handleChange('gateName', newValue?.name || '')}
              freeSolo
              renderInput={(params) => (
                <TextField {...params} label="Gate Name" fullWidth />
              )}
            />
          </Grid>

          {/* Quantity, Price, Cost, and Amount */}
          <Grid item xs={12} sm={3} lg={4}>
            <TextField
              fullWidth
              type="number"
              label="Quantity"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3} lg={4}>
            <TextField
              fullWidth
              type="number"
              label="Price"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
            />
          </Grid>
       
          <Grid item xs={12} sm={3} lg={4}>
            <TextField
              fullWidth
              type="number"
              label="Amount"
              value={formData.amount}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3} lg={4}>
            <TextField
              fullWidth
              type="number"
              label="Cost Price"
              value={formData.costPrice}
              onChange={(e) => handleChange('costPrice', e.target.value)} // Added handler for 'cost'
            />
          </Grid>
          <Grid item xs={12} sm={3} lg={4}>
            <TextField
              fullWidth
              type="number"
              label="Cost Amount"
              value={formData.costAmount}
              onChange={(e) => handleChange('costAmount', e.target.value)} // Added handler for 'cost'
              InputProps={{ readOnly: true }}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
          <Button 
            variant="contained" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Order'}
          </Button>
        </Box>
      </form>

      {/* Customer Management Modal (unchanged) */}
      <Modal open={openModal} onClose={() => { setOpenModal(false); setEditingCustomer(null); setNewCustomer(''); }}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 400 }, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2
        }}>
          <Typography variant="h6" gutterBottom>
            {editingCustomer ? 'Edit Customer' : 'Manage Customers'}
          </Typography>
          
          <TextField
            fullWidth
            label="Customer Name"
            value={newCustomer}
            onChange={(e) => setNewCustomer(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button 
              variant="contained" 
              onClick={editingCustomer ? () => handleEditCustomer(editingCustomer) : handleAddCustomer}
              disabled={!newCustomer}
            >
              {editingCustomer ? 'Update' : 'Add'}
            </Button>
            <Button variant="outlined" onClick={() => { setEditingCustomer(null); setNewCustomer(''); }}>
              Clear
            </Button>
          </Box>

          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            {customers.map(customer => (
              <Box key={customer.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography>{customer.name}</Typography>
                <Box>
                  <IconButton onClick={() => { setEditingCustomer(customer); setNewCustomer(customer.name); }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteCustomer(customer.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Modal>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default DataEntryForm;