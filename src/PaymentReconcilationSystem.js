import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  InputLabel,
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
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { format } from 'date-fns';
import CircularProgress from '@mui/material/CircularProgress';
import { useReactToPrint } from 'react-to-print';
import PrintableHistory from './PrintableHistory';

const PaymentReconciliationSystem = () => {
  // State management
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(''); // Changed from selectedCustomer
  const [selectedEntityType, setSelectedEntityType] = useState('customer'); // New state for entity type
  const [customers, setCustomers] = useState([]);
  const [payees, setPayees] = useState([]); // New state for payees
  const [records, setRecords] = useState([]); // Changed from orders to records
  const [payments, setPayments] = useState([]);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
  });

  const paymentMethods = ['Cash', 'Kpay', 'WavePay', 'Bank Transfer'];
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const contentRef = useRef(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // Fetch customers and payees from Firestore
  useEffect(() => {
    // Fetch customers
    const customersRef = collection(db, 'customers');
    const unsubscribeCustomers = onSnapshot(customersRef, (snapshot) => {
      const customerData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(customerData);
    });

    // Fetch payees
    const payeesRef = collection(db, 'payees');
    const unsubscribePayees = onSnapshot(payeesRef, (snapshot) => {
      const payeeData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPayees(payeeData);
    });

    return () => {
      unsubscribeCustomers();
      unsubscribePayees();
    };
  }, []);

  // Handle entity type and entity selection
  const handleEntityTypeChange = (event) => {
    setSelectedEntityType(event.target.value);
    setSelectedEntity(''); // Reset entity selection when type changes
    setRecords([]);
    setPayments([]);
  };

  const handleEntityChange = async (event) => {
    const entityId = event.target.value;
    setSelectedEntity(entityId);
    setIsLoading(true);

    if (entityId) {
      if (selectedEntityType === 'customer') {
        // Fetch orders for customer
        const ordersQuery = query(
          collection(db, 'orders'),
          where('customerId', '==', entityId)
        );
        const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
          const ordersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          const updatedRecords = [...ordersData].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
          setRecords(updatedRecords);
          setIsLoading(false);
        });

        // Fetch payments for customer
        const paymentsQuery = query(
          collection(db, 'payments'),
          where('customerId', '==', entityId)
        );
        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
          const paymentsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPayments(paymentsData);
        });

        return () => {
          unsubscribeOrders();
          unsubscribePayments();
        };
      } else {
        // Fetch payee records
        const payeesQuery = query(
          collection(db, 'payees'),
          where('payeeName', '==', payees.find((p) => p.id === entityId)?.payeeName)
        );
        const unsubscribePayees = onSnapshot(payeesQuery, (snapshot) => {
          const payeeData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            amount: doc.data().costAmount, // Map costAmount to amount for consistency
            date: doc.data().orderDate, // Map orderDate to date
          }));
          const updatedRecords = [...payeeData].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
          setRecords(updatedRecords);
          setIsLoading(false);
        });

        // Fetch payments for payee
        const paymentsQuery = query(
          collection(db, 'payments'),
          where('payeeId', '==', entityId)
        );
        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
          const paymentsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPayments(paymentsData);
        });

        return () => {
          unsubscribePayees();
          unsubscribePayments();
        };
      }
    } else {
      setRecords([]);
      setPayments([]);
      setIsLoading(false);
    }
  };

  // Allocate payment to records
  const allocatePayment = async (paymentAmount, paymentId) => {
    let remainingPayment = paymentAmount;
    const updatedRecords = [...records].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    for (let record of updatedRecords) {
      if (record.status === 'unpaid' && remainingPayment > 0) {
        const unpaidAmount = record.amount - record.paidAmount;
        const allocation = Math.min(remainingPayment, unpaidAmount);

        record.paidAmount += allocation;
        remainingPayment -= allocation;

        if (record.paidAmount >= record.amount) {
          record.status = 'paid';
        }

        // Update record in Firestore
        const collectionName = selectedEntityType === 'customer' ? 'orders' : 'payees';
        await updateDoc(doc(db, collectionName, record.id), {
          paidAmount: record.paidAmount,
          status: record.status,
        });
      }
    }

    setRecords(updatedRecords);
    return remainingPayment;
  };

  // Handle adding a new payment
  const handleAddPayment = async () => {
    if (!newPayment.amount || !selectedEntity || !newPayment.paymentMethod || !newPayment.date)
      return;

    const paymentToAdd = {
      [selectedEntityType === 'customer' ? 'customerId' : 'payeeId']: selectedEntity,
      date: newPayment.date,
      amount: parseFloat(newPayment.amount),
      description: newPayment.description,
      paymentMethod: newPayment.paymentMethod,
      createdAt: new Date().toISOString(),
      transactionId: `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
    };

    try {
      const paymentRef = await addDoc(collection(db, 'payments'), paymentToAdd);
      const unallocated = await allocatePayment(paymentToAdd.amount, paymentRef.id);

      await updateDoc(paymentRef, {
        allocated: true,
        unallocatedAmount: unallocated,
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

  // Handle deleting a payment
  const handleDeletePayment = async () => {
    if (!selectedPayment) return;

    try {
      // Reset affected records
      const affectedRecords = records.filter((record) => record.paidAmount > 0);
      const collectionName = selectedEntityType === 'customer' ? 'orders' : 'payees';
      for (let record of affectedRecords) {
        await updateDoc(doc(db, collectionName, record.id), {
          paidAmount: 0,
          status: 'unpaid',
        });
      }

      // Delete the payment
      await deleteDoc(doc(db, 'payments', selectedPayment.id));

      // Re-allocate remaining payments
      const remainingPayments = payments
        .filter((p) => p.id !== selectedPayment.id)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      for (let payment of remainingPayments) {
        const unallocated = await allocatePayment(payment.amount, payment.id);
        await updateDoc(doc(db, 'payments', payment.id), {
          allocated: true,
          unallocatedAmount: unallocated,
        });
      }

      setSelectedPayment(null);
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  // Handle editing a payment
  const handleEditPayment = async () => {
    if (!selectedPayment) return;

    try {
      // Reset affected records
      const affectedRecords = records.filter((record) => record.paidAmount > 0);
      const collectionName = selectedEntityType === 'customer' ? 'orders' : 'payees';
      for (let record of affectedRecords) {
        await updateDoc(doc(db, collectionName, record.id), {
          paidAmount: 0,
          status: 'unpaid',
        });
      }

      // Update the payment
      await updateDoc(doc(db, 'payments', selectedPayment.id), {
        date: selectedPayment.date,
        description: selectedPayment.description,
        paymentMethod: selectedPayment.paymentMethod,
        amount: parseFloat(selectedPayment.amount),
        unallocatedAmount: 0,
      });

      // Re-allocate the updated payment
      const unallocated = await allocatePayment(
        parseFloat(selectedPayment.amount),
        selectedPayment.id
      );

      await updateDoc(doc(db, 'payments', selectedPayment.id), {
        allocated: true,
        unallocatedAmount: unallocated,
      });

      setIsEditFormOpen(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error updating payment:', error);
    };
  };

  // Calculate totals and balances
  const calculations = useMemo(() => {
    const totalRecords = records.reduce((sum, record) => sum + record.amount, 0);
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPaid = records.reduce((sum, record) => sum + record.paidAmount, 0);
    const remainingBalance = totalRecords - totalPaid;

    return {
      totalRecords,
      totalPayments,
      totalPaid,
      remainingBalance,
    };
  }, [records, payments]);

  // Filter records and payments by date range
  const filteredRecords = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return records;
    return records.filter((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate >= new Date(dateRange.startDate) &&
        recordDate <= new Date(dateRange.endDate)
      );
    });
  }, [records, dateRange]);

  const filteredPayments = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return payments;
    return payments.filter((payment) => {
      const paymentDate = new Date(payment.date);
      return (
        paymentDate >= new Date(dateRange.startDate) &&
        paymentDate <= new Date(dateRange.endDate)
      );
    });
  }, [payments, dateRange]);

  // Prepare statement data for printing
  const statementData = useMemo(() => {
    if (!selectedEntity) return null;

    const entity =
      selectedEntityType === 'customer'
        ? customers.find((c) => c.id === selectedEntity)
        : payees.find((p) => p.id === selectedEntity);
    const totals = {
      totalRecords: filteredRecords.reduce((sum, record) => sum + record.amount, 0),
      totalPayments: filteredPayments.reduce((sum, payment) => sum + payment.amount, 0),
      totalPaid: filteredRecords.reduce((sum, record) => sum + record.paidAmount, 0),
      remainingBalance: filteredRecords.reduce(
        (sum, record) => sum + (record.amount - record.paidAmount),
        0
      ),
    };

    return {
      entityName: entity?.name || entity?.payeeName || 'Unknown Entity',
      entityType: selectedEntityType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      records: filteredRecords,
      payments: filteredPayments,
      totals,
    };
  }, [filteredRecords, filteredPayments, customers, payees, selectedEntity, selectedEntityType, dateRange]);

  // Reset date range
  const handleResetDateRange = () => {
    setDateRange({ startDate: new Date(), endDate: new Date() });
  };

  return (
    <Paper elevation={0} sx={{ p: 3, maxWidth: 'xl', mx: 'auto', border: '1px solid #ccc' }}>
      {/* Entity Type and Entity Selection */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={selectedEntityType}
                onChange={handleEntityTypeChange}
                label="Entity Type"
              >
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="payee">Payee</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={8}>
            <FormControl fullWidth>
              <InputLabel>Select {selectedEntityType === 'customer' ? 'Customer' : 'Payee'}</InputLabel>
              <Select
                value={selectedEntity}
                onChange={handleEntityChange}
                label={`Select ${selectedEntityType === 'customer' ? 'Customer' : 'Payee'}`}
              >
                <MenuItem value="">
                  <em>Select a {selectedEntityType}</em>
                </MenuItem>
                {(selectedEntityType === 'customer' ? customers : payees).map((entity) => (
                  <MenuItem key={entity.id} value={entity.id}>
                    {entity.name || entity.payeeName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {selectedEntity && (
        <>
          {/* Date Range Selection */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Start Date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
            <TextField
              label="End Date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
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
              <Button variant="outlined" onClick={handleResetDateRange}>
                Reset Dates
              </Button>
            </ButtonGroup>
          </Box>

          {/* Hidden Printable Component */}
          <Box sx={{ display: 'none' }}>
            {statementData && <PrintableHistory statementData={statementData} ref={contentRef} />}
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
                      Total Records Value
                    </Typography>
                    <Typography variant="h6">
                      {calculations.totalRecords.toLocaleString()}
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

              {/* Records Table */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h6"
                  sx={{ display: 'flex', justifyContent: 'flex-start' }}
                  gutterBottom
                >
                  Records History
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        {selectedEntityType === 'payee' && (
                          <TableCell align="right">Quantity</TableCell>
                        )}
                        <TableCell align="right">Paid Amount</TableCell>
                        <TableCell align="right">Remaining</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {format(new Date(record.date), 'dd-MM-yyyy')}
                          </TableCell>
                          <TableCell align="right">
                            {record.amount.toLocaleString()}
                          </TableCell>
                          {selectedEntityType === 'payee' && (
                            <TableCell align="right">{record.quantity}</TableCell>
                          )}
                          <TableCell align="right">
                            {record.paidAmount.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            {(record.amount - record.paidAmount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={record.status}
                              color={record.status === 'paid' ? 'success' : 'warning'}
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
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Payment History</Typography>
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
                      color="secondary"
                      onClick={() => setIsEditFormOpen(true)}
                      disabled={!selectedPayment}
                      sx={{ mr: 1 }}
                    >
                      Edit
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
                      {filteredPayments.map((payment) => (
                        <TableRow
                          key={payment.id}
                          hover
                          onClick={() => setSelectedPayment(payment)}
                          selected={selectedPayment?.id === payment.id}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            {format(new Date(payment.date), 'dd-MM-yyyy')}
                          </TableCell>
                          <TableCell>{payment.description}</TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell align="right">
                            {payment.amount.toLocaleString()}
                          </TableCell>
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
              onChange={(e) =>
                setNewPayment({ ...newPayment, date: e.target.value })
              }
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Description"
              value={newPayment.description}
              onChange={(e) =>
                setNewPayment({ ...newPayment, description: e.target.value })
              }
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={newPayment.paymentMethod}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, paymentMethod: e.target.value })
                }
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
              onChange={(e) =>
                setNewPayment({ ...newPayment, amount: e.target.value })
              }
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentFormOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddPayment}
            variant="contained"
            color="primary"
            disabled={!selectedEntity}
          >
            Add Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Payment Dialog */}
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
              onChange={(e) =>
                setSelectedPayment({ ...selectedPayment, date: e.target.value })
              }
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Description"
              value={selectedPayment?.description || ''}
              onChange={(e) =>
                setSelectedPayment({
                  ...selectedPayment,
                  description: e.target.value,
                })
              }
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={selectedPayment?.paymentMethod || ''}
                onChange={(e) =>
                  setSelectedPayment({
                    ...selectedPayment,
                    paymentMethod: e.target.value,
                  })
                }
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
              onChange={(e) =>
                setSelectedPayment({ ...selectedPayment, amount: e.target.value })
              }
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditFormOpen(false)}>Cancel</Button>
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