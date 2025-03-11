// firebase.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore,getDoc,doc } from "firebase/firestore";
import { getAuth, } from "firebase/auth";
import { getStorage } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


const firebaseConfig = {
  apiKey: "AIzaSyA45W5d3onlWU-RO-CENSJfo33NspWmeZo",
  authDomain: "ats-tfms.firebaseapp.com",
  projectId: "ats-tfms",
  storageBucket: "ats-tfms.firebasestorage.app",
  messagingSenderId: "276936909655",
  appId: "1:276936909655:web:5bebadd55fa69421501412",
  measurementId: "G-PQJ66RKQXH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
const db = getFirestore(app);

//Auth
const auth = getAuth(app);
// Initialize Firebase Storage
const storage = getStorage(app);

export { app,db,auth,storage,analytics };

export default app;
