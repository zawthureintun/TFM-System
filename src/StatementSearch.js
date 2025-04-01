import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import {db} from './Firebase';
import {format} from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import PrintableStatement from './PrintableStatement';

const StatementSearch = () => {
  const [customerName, setCustomerName] = useState('');
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unpaidCustomers, setUnpaidCustomers] = useState([]);
  const contentRef = useRef(null);

  const reactToPrintFn = useReactToPrint({ contentRef });

  // Fetch unpaid orders based on customer name
  const searchOrders = () => {
    if (!customerName.trim()) return;
  
    setLoading(true);
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerName', '>=', customerName.trim()),
      where('customerName', '<=', customerName.trim() + '\uf8ff'),
      where('status', '==', 'unpaid')
    );
  
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      // Sort orders by date in descending order (latest first)
      ordersData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Descending order
      });
  
      if (ordersData.length > 0) {
        const firstOrder = ordersData[0];
        const totalBalance = ordersData.reduce((sum, order) => 
          sum + (order.amount - order.paidAmount), 0);
  
        setStatementData({
          customer: firstOrder.customerName,
          balance: totalBalance,
          orders: ordersData.map(order => ({
            id: order.orderID,
            date: order.date,
            itemName: order.itemName,
            amount: order.amount,
            formType: order.formType,
            quantity: order.quantity,
            price: order.price,
            gate: order.gateName
          }))
        });
      } else {
        setStatementData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      setLoading(false);
    });
  
    return () => unsubscribe();
  };

  useEffect(() => {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', '==', 'unpaid')
    );
  
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const customers = [...new Set(
        snapshot.docs.map(doc => doc.data().customerName)
      )].sort();
      setUnpaidCustomers(customers);
    });
  
    return () => unsubscribe();
  }, []);

  return (
    <Paper elevation={0} sx={{ p: 3, maxWidth: 'xl', mx: 'auto', border: '1px solid #ccc' }}>
      {/* Search Section */}
      <Box 
        sx={{ 
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: { xs: 'stretch', sm: 'center' }
        }}
      >
        <FormControl 
          fullWidth 
          sx={{ 
            maxWidth: { sm: 400 }
          }}
        >
          <InputLabel>Select Customer</InputLabel>
          <Select
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            label="Select Customer"
            disabled={loading}
          >
            <MenuItem value="">
              <em>Select a customer</em>
            </MenuItem>
            {unpaidCustomers.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button 
          variant="contained"
          size="large"
          onClick={searchOrders}
          disabled={loading || !customerName}
          sx={{ 
            px: 4,
            py: 1,
            borderRadius: 1,
            minWidth: { xs: '100%', sm: 'auto' }
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </Box>

      {statementData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Existing Display Section */}
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'flex-start' },
              gap: 2
            }}
          >
            <Box sx={{ textAlign: 'left' }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: { xs: '1.5rem', md: '2.125rem' },
                  mb: 1
                }}
              >
                {statementData.customer}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }}
              >
                Statement as of {new Date().toLocaleDateString()}
              </Typography>
            </Box>
            <Stack 
              spacing={1} 
              alignItems={{ xs: 'flex-start', md: 'flex-end' }}
            >
              <Typography variant="subtitle1" color="text.secondary">
                Balance to Collect
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: 'error.main',
                  fontSize: { xs: '1.5rem', md: '2.125rem' }
                }}
              >
                {statementData.balance.toLocaleString()}
              </Typography>
              <Button 
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => reactToPrintFn()}
                disabled={!statementData} // Disable if no data
                sx={{ 
                  mt: 1,
                  borderRadius: 1,
                  px: 3,
                  textTransform: 'none'
                }}
              >
                Print Statement
              </Button>
            </Stack>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Unpaid Orders
            </Typography>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Form Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statementData.orders.map((order) => (
                  <TableRow 
                    key={order.id}
                    sx={{ 
                      '&:hover': { bgcolor: 'grey.50' },
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <TableCell>{format(new Date(order.date),"dd-MM-yyyy")}</TableCell>
                    <TableCell>{order.itemName}</TableCell>
                    <TableCell>{order.formType}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.price.toLocaleString()}</TableCell>
                    <TableCell align="right">{order.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
      <Box sx={{ display: 'none' }}>
      {statementData && <PrintableStatement statementData={statementData} ref={contentRef}/>}
      </Box>
    </Paper>
  );
};

export default StatementSearch;