// firebase-config.js
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBTjcmqUAh3L7x8N8jDrCWsUwARziuNII",
  authDomain: "zad-fatorah.firebaseapp.com",
  projectId: "zad-fatorah",
  storageBucket: "zad-fatorah.firebasestorage.app",
  messagingSenderId: "888660151861",
  appId: "1:888660151861:web:43216bb5686dfab390ab7c",
  measurementId: "G-XRQR4E6DKM"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Get references to Auth and Firestore services
const auth = firebase.auth();
const db = firebase.firestore();
