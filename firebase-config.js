<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js"></script>
<script>
  const firebaseConfig = {
    apiKey: "AIzaSyAJaFVETxpy8Vr5e6RXDWi3NBhEUaZEPN4",
    authDomain: "malcolm-finance.firebaseapp.com",
    projectId: "malcolm-finance",
    storageBucket: "malcolm-finance.firebasestorage.app",
    messagingSenderId: "987613399580",
    appId: "1:987613399580:web:0237b2c8c2c7df54222dd9"
  };
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();
</script>