// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8VzSO9iXHauCJgd6FbLO0EzMZ1MfEcDo",
  authDomain: "kanban-board-c8062.firebaseapp.com",
  projectId: "kanban-board-c8062",
  storageBucket: "kanban-board-c8062.firebasestorage.app",
  messagingSenderId: "429776180828",
  appId: "1:429776180828:web:06955f3806459e3b83b899",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);

console.log("Firebase initialized");
