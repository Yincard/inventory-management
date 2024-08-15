// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBXM-28BpQ3MTZ0lZ_oKor0EaiiHqoawhc",
  authDomain: "inventory-management-48f3e.firebaseapp.com",
  projectId: "inventory-management-48f3e",
  storageBucket: "inventory-management-48f3e.appspot.com",
  messagingSenderId: "833901875168",
  appId: "1:833901875168:web:1ff87f5008854cff386585",
  measurementId: "G-EG98R0F3CG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export {firestore};