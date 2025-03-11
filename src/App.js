import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, useHistory } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './Firebase';
import Login from './Login';
import TradeFormApp from './TradeFormApp';
import PrivateRoute from './PrivateRoute';
import Logout from './Logout';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Switch>
          <PrivateRoute path="/trade" component={TradeFormApp} />
          <PrivateRoute path="/logout" component={Logout} />
          <Route path="/login" component={Login} />
          <Redirect exact from="/" to="/trade" />
          {/* Add more routes as needed */}
        </Switch>
      </Router>
      </ThemeProvider>
  );
}
export default App;