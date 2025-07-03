import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyA_4RAbPHGRut7kLK5TorqBkGbUIg1qfiI",
    authDomain: "tfila-772ad.firebaseapp.com",
    projectId: "tfila-772ad",
    storageBucket: "tfila-772ad.firebasestorage.app",
    messagingSenderId: "1041334561919",
    appId: "1:1041334561919:web:c5222a28a5de705439a34a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const GABBAI_UID = 'ifLRL99dWkY9TWKK434YbUijo8J2';

const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMsg.textContent = '';

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // כל משתמש עובר ל-admin.html, שם תתבצע בדיקת הרשאות
        window.location.href = 'admin.html';
    } catch (error) {
        console.error('Login Error:', error);
        errorMsg.textContent = 'שם משתמש או סיסמה שגויים.';
    }
});

const forgotPasswordLink = document.getElementById('forgot-password-link');
if (forgotPasswordLink) {
  forgotPasswordLink.onclick = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) {
      errorMsg.textContent = 'אנא הזן כתובת אימייל בשדה המתאים ולאחר מכן לחץ שוב.';
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      errorMsg.textContent = 'קישור לאיפוס סיסמה נשלח לאימייל.';
    } catch (error) {
      console.error('Password reset error:', error);
      errorMsg.textContent = 'אירעה שגיאה בשליחת קישור איפוס. ודא שהאימייל נכון.';
    }
  };
} 