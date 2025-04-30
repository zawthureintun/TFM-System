import React from 'react';
import { 
  Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Box, Grid,
  Container
} from '@mui/material';
import { format } from 'date-fns';

// Component to be used for printing payment history
const PrintableHistory = React.forwardRef((props, ref) => {
  const { statementData } = props;
  
  if (!statementData) {
    return <div ref={ref}><Typography>No statement data available to print.</Typography></div>;
  }

  const entityLabel = statementData.entityType === 'customer' ? 'Customer' : 'Payee';

  return (
    <div ref={ref} className="printable-statement">
      <Container>
        {/* Header Section */}
        <Box sx={{ position: 'relative', mb: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 0 }}>Aye Htike San</Typography>
            <Typography variant="h5" sx={{ mb: 0 }}>Logistics Service</Typography>
            <Typography sx={{ mb: 2 }}>Phone: 09265697897, 09400369326, 092400650</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography>Date: {format(new Date(), 'dd-MM-yyyy')}</Typography>
          </Box>
        </Box>

        {/* Entity Information */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6}>
            <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>{entityLabel}:</Typography>
              <Typography>{statementData.entityName}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography>
                <strong>Total Records: </strong>{statementData.totals.totalRecords.toLocaleString()} ကျပ်
              </Typography>
              <Typography>
                <strong>Total Payments: </strong>{statementData.totals.totalPayments.toLocaleString()} ကျပ်
              </Typography>
              <Typography
                sx={{
                  display: 'inline-block',
                  borderRadius: 1,
                  color: 'error.light',
                }}
              >
                <strong>Balance: </strong>{statementData.totals.remainingBalance.toLocaleString()} ကျပ်
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Records Table */}
        <Typography variant="h6" sx={{textAlign:'center'}} gutterBottom>Records History</Typography>
        <TableContainer sx={{ mb: 4, mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                {statementData.entityType === 'payee' && (
                  <TableCell align="right">Quantity</TableCell>
                )}
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Paid Amount</TableCell>
                <TableCell align="right">Remaining</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statementData.records.length > 0 ? (
                statementData.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.date), "dd-MM-yyyy")}</TableCell>
                    <TableCell>{record.description || 'No description'}</TableCell>
                    {statementData.entityType === 'payee' && (
                      <TableCell align="right">{record.quantity || 1}</TableCell>
                    )}
                    <TableCell align="right">{(record.amount || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{(record.paidAmount || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      {((record.amount || 0) - (record.paidAmount || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell>{record.status || 'unpaid'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={statementData.entityType === 'payee' ? 7 : 6} align="center">
                    No records found
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={1} />
                <TableCell align="right"><strong>Total:</strong></TableCell>
                <TableCell align="right"><strong>{statementData.totals.totalRecords.toLocaleString()}</strong></TableCell>
                <TableCell align="right"><strong>{statementData.totals.totalPaid.toLocaleString()}</strong></TableCell>
                <TableCell align="right"><strong>{statementData.totals.remainingBalance.toLocaleString()}</strong></TableCell>
                <TableCell colSpan={1}/>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Payments Table */}
        <Typography variant="h6" sx={{textAlign:'center'}} gutterBottom>Payment History</Typography>
        <TableContainer sx={{ mb: 4, mt: 2 }}>
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
              {statementData.payments.length > 0 ? (
                statementData.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.date), "dd-MM-yyyy")}</TableCell>
                    <TableCell>{payment.description || 'No description'}</TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell align="right">{payment.amount.toLocaleString()}</TableCell>
                    <TableCell align="right">{(payment.unallocatedAmount || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No payments found
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={3} />
                <TableCell align="right"><strong>Total:</strong></TableCell>
                <TableCell align="right"><strong>{statementData.totals.totalPayments.toLocaleString()}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2">
            Statement period: {format(new Date(statementData.startDate), "dd-MM-yyyy")} - {format(new Date(statementData.endDate), "dd-MM-yyyy")}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>Thank you for your business!</Typography>
        </Box>
      </Container>
    </div>
  );
});

// Add display name
PrintableHistory.displayName = 'PrintableHistory';

export default PrintableHistory;