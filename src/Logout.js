// src/App.js
import React from 'react';import { auth} from './Firebase'; 
import { useHistory } from 'react-router-dom';

const Logout=()=> {
    const history=useHistory();
    localStorage.removeItem('authToken');
    // Sign out from Firebase
    auth.signOut();
    // Redirect to login page
    history.push('/login');
}

export default Logout;
