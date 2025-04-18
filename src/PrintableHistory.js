import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Grid,
  Container,
} from '@mui/material';
import { format } from 'date-fns';

// Proper forwardRef implementation with explicit displayName
const PrintableHistory = React.forwardRef((props, ref) => {
  const { statementData } = props;

  if (!statementData) {
    return (
      <div ref={ref}>
        <Typography>No data available to print.</Typography>
      </div>
    );
  } else {
    console.log('Statement data is', statementData);
  }

  return (
    <div ref={ref}>
      <Container sx={{ p: 4, '@media print': { p: 2 } }}>
        {/* Header */}
        <Box sx={{ position: 'relative', mb: 4 }}>
          <Box
            component="img"
            src="https://firebasestorage.googleapis.com/v0/b/ordermaster-decee.appspot.com/o/ATS-Logo.png?alt=media&token=176d8bc6-911f-4390-9ebd-6fce830df485"
            alt="Company Logo"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 120,
              height: 80,
              borderRadius: '0%',
            }}
          />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 0 }}>
              Aye Htike San
            </Typography>
            <Typography variant="h5" sx={{ mb: 0 }}>
              Logistics Service
            </Typography>
            <Typography sx={{ mb: 2 }}>
              Phone: 09265697897, 09400369326, 092400650
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography>Date: {format(new Date(), 'dd-MM-yyyy')}</Typography>
          </Box>
        </Box>
        <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, width: '40%' }} mb={2}>
          <Typography variant="h6">
            {statementData.entityName} ({statementData.entityType})
          </Typography>
          <Typography>
            Period: {format(new Date(statementData.startDate), 'dd-MM-yyyy')}-
            {format(new Date(statementData.endDate), 'dd-MM-yyyy')}
          </Typography>
        </Box>

        {/* Records Table */}
        <Typography variant="h6" gutterBottom>
          {statementData.entityType === 'customer' ? 'Orders History' : 'Payee Records'}
        </Typography>
        <TableContainer sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                {statementData.entityType === 'payee' && (
                  <TableCell align="right">Quantity</TableCell>
                )}
                <TableCell align="right">Paid Amount</TableCell>
                <TableCell align="right">Remaining</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statementData.records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.date), 'dd-MM-yyyy')}</TableCell>
                  <TableCell align="right">{record.amount.toLocaleString()}</TableCell>
                  {statementData.entityType === 'payee' && (
                    <TableCell align="right">{record.quantity}</TableCell>
                  )}
                  <TableCell align="right">{record.paidAmount.toLocaleString()}</TableCell>
                  <TableCell align="right">
                    {(record.amount - record.paidAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>{record.status}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <strong>Total</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{statementData.totals.totalRecords.toLocaleString()}</strong>
                </TableCell>
                {statementData.entityType === 'payee' && <TableCell />}
                <TableCell align="right">
                  <strong>{statementData.totals.totalPaid.toLocaleString()}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{statementData.totals.remainingBalance.toLocaleString()}</strong>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Payments Table */}
        <Typography variant="h6" gutterBottom>Payments History</Typography>
        <TableContainer sx={{ mb: 4 }}>
          <Table size="small">
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
              {statementData.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.date), 'dd-MM-yyyy')}</TableCell>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell>{payment.paymentMethod}</TableCell>
                  <TableCell align="right">{payment.amount.toLocaleString()}</TableCell>
                  <TableCell align="right">
                    {(payment.unallocatedAmount || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3}>
                  <strong>Total Payments</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{statementData.totals.totalPayments.toLocaleString()}</strong>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2">End of Statement</Typography>
        </Box>
      </Container>
    </div>
  );
});

// Add display name
PrintableHistory.displayName = 'PrintableHistory';

export default PrintableHistory;