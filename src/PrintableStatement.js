import React from 'react';
import { 
  Paper, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Box, Grid,
  Container
} from '@mui/material';
import { format } from 'date-fns';

// Proper forwardRef implementation with explicit displayName
const PrintableStatement = React.forwardRef((props, ref) => {
  const { statementData } = props;
  
  if (!statementData) {
    return <div ref={ref}><Typography>No statement data available to print.</Typography></div>;
  }

  return (
    <div ref={ref} className="printable-statement">
      <Container sx={{ p: 4, '@media print': { p: 7,m:2 } }}>
        {/* Header Section */}
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
            <Typography variant="h4" sx={{ mb: 0 }}>Aye Htike San</Typography>
            <Typography variant="h5" sx={{ mb: 0 }}>Logistics Service</Typography>
            <Typography sx={{ mb: 2 }}>Phone: 09265697897, 09400369326, 092400650</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
          <Typography>Date: {format(new Date(), 'dd-MM-yyyy')}</Typography>
          </Box>
        </Box>

        {/* Customer Information */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6}>
            <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Customer:</Typography>
              <Typography>{statementData.customer}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Summary</Typography>
              <Typography
                sx={{
                  display: 'inline-block',
                  borderRadius: 1,
                  color:'error.light',
                }}
              >
               <strong> Balance: {statementData.balance.toLocaleString()} ကျပ်</strong>
                </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Unpaid Orders */}
        <Typography variant="h6" sx={{textAlign:'center'}} gutterBottom>Unpaid Orders</Typography>
        <TableContainer sx={{ mb: 4,mt:2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Form Type</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Price</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statementData.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{format(new Date(order.date),"dd-MM-yyyy")}</TableCell>
                  <TableCell>{order.itemName}</TableCell>
                  <TableCell>{order.formType}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{order.price.toLocaleString()}</TableCell>
                  <TableCell align="right">{order.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} />
                <TableCell align="right"><strong>Total Balance:</strong></TableCell>
                <TableCell align="right"><strong>{statementData.balance.toLocaleString()} MMK</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2">Thank you for your business!</Typography>
        </Box>
      </Container>
    </div>
  );
});

// Add display name
PrintableStatement.displayName = 'PrintableStatement';

export default PrintableStatement;