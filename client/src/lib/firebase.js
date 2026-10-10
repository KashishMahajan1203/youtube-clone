// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5DTBvat63iJLCzN1UV8mNRZSZ7lg89uA",
  authDomain: "you-tube-ece31.firebaseapp.com",
  projectId: "you-tube-ece31",
  storageBucket: "you-tube-ece31.firebasestorage.app",
  messagingSenderId: "397738130676",
  appId: "1:397738130676:web:81229cd25536e6312af2a1",
  measurementId: "G-SH0QNLX3VB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider, RecaptchaVerifier };
