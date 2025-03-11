import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography, Container, Paper, Button } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PagesIcon from '@mui/icons-material/Pages';
import { useHistory } from 'react-router-dom';

const DataEntryForm = React.lazy(() => import('./DataEntryForm'));
const OrdersTable = React.lazy(() => import('./OrdersTable'));
const StatementSearch = React.lazy(() => import('./StatementSearch'));
const PaymentReconcilationSystem = React.lazy(() => import('./PaymentReconcilationSystem'));

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TradeFormApp = () => {
  const [value, setValue] = useState(0);
  const history = useHistory();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleLogout = async () => {
    try {
      // await signOut(auth);
      history.push('/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, position: 'relative' }}>
      {/* Logout Button at top-right corner */}
      <Button
        variant="outlined"
        color="primary"
        onClick={handleLogout}
        sx={{ 
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000
        }}
      >
        Logout
      </Button>

      {/* Responsive Header Section */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          mt: 2,
          width: '100%',
          gap: 2 // Adds consistent spacing between icon and text
        }}
      >
        <PagesIcon sx={{ fontSize: 60 }} color='primary' />
        <Typography 
          variant="h4" 
          color="primary"
          sx={{ 
            fontWeight: 'bold',
            m: 0 // Removes all margins
          }}
        >
          Trade Form Management System
        </Typography>
      </Box>
      
      <Box sx={{ width: '100%' }}>
        <Box 
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            mb: 2 
          }}
        >
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="trade form tabs"
            variant="fullWidth"
          >
            <Tab label="Order Entry" />
            <Tab label="Orders" />
            <Tab label="Payments" />
            <Tab label="Statements" />
          </Tabs>
        </Box>

        <React.Suspense fallback={<Box sx={{ p: 2 }}>Loading...</Box>}>
          <TabPanel value={value} index={0}>
            <Paper elevation={0}>
              <DataEntryForm />
            </Paper>
          </TabPanel>
          
          <TabPanel value={value} index={1}>
            <Paper elevation={0}>
              <OrdersTable />
            </Paper>
          </TabPanel>
          
          <TabPanel value={value} index={2}>
            <Paper elevation={0}>
              <PaymentReconcilationSystem/>
            </Paper>
          </TabPanel>
          
          <TabPanel value={value} index={3}>
            <Paper elevation={0}>
              <StatementSearch />
            </Paper>
          </TabPanel>
        </React.Suspense>
      </Box>
    </Container>
  );
};

export default TradeFormApp;