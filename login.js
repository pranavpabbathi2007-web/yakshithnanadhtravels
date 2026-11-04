/**
 * YAKSHITH NANDH TRAVELS - Strict Firebase Admin Authentication
 * Authenticates directly with Firebase Authentication (Project: yakshithnandhtravels)
 */

import { auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('adminLoginForm');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');
  const rememberMe = document.getElementById('rememberMe');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const alertBox = document.getElementById('loginAlert');
  const alertText = document.getElementById('loginAlertText');

  // 1. Auto-redirect if already logged in with Firebase
  const existingToken = localStorage.getItem('ynt_admin_token') || sessionStorage.getItem('ynt_admin_token');
  if (existingToken) {
    window.location.replace('admin.html');
    return;
  }

  // 2. Toggle password visibility
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.style.color = isPassword ? 'var(--color-primary)' : 'var(--color-text-muted)';
    });
  }

  // 3. Error helpers
  const showError = (message) => {
    alertText.textContent = message || 'Authentication failed. Please verify credentials.';
    alertBox.classList.add('visible');
    passwordInput.value = '';
    passwordInput.focus();
    alertBox.style.animation = 'none';
    alertBox.offsetHeight;
    alertBox.style.animation = 'shake 0.3s ease';
  };

  const hideError = () => {
    alertBox.classList.remove('visible');
  };

  emailInput.addEventListener('input', hideError);
  passwordInput.addEventListener('input', hideError);

  // 4. Form submission: Strict Firebase Auth
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      if (!email || !password) {
        showError('Please enter your email and password.');
        return;
      }

      // Button loading state
      const originalBtnHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:8px;">
          <svg style="animation:spin 1s linear infinite; width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24">
            <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8zm0 16c4.41 0 8-3.59 8-8h2c0 5.52-4.48 10-10 10v-2z"/>
          </svg>
          <span>Verifying with Firebase...</span>
        </span>
      `;

      try {
        // Direct Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const token = await user.getIdToken();

        const adminUser = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          source: 'firebase'
        };

        saveSession(token, adminUser, rememberMe.checked);
        window.location.replace('admin.html');
      } catch (err) {
        console.error('Firebase Auth Error:', err.code, err.message);

        let friendlyMessage = 'Authentication failed. Please check credentials.';
        switch (err.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
            friendlyMessage = 'Incorrect email or password. Please verify the credentials assigned in your Firebase project.';
            break;
          case 'auth/user-not-found':
            friendlyMessage = 'No user found with this email in your Firebase Authentication project.';
            break;
          case 'auth/user-disabled':
            friendlyMessage = 'This admin account has been disabled in your Firebase Console.';
            break;
          case 'auth/invalid-email':
            friendlyMessage = 'Please enter a valid email address.';
            break;
          case 'auth/too-many-requests':
            friendlyMessage = 'Too many failed attempts. Please wait a few moments and try again.';
            break;
          case 'auth/operation-not-allowed':
            friendlyMessage = 'Email/Password sign-in is not enabled in Firebase Console. Go to Firebase Console > Authentication > Sign-in method and enable Email/Password.';
            break;
          default:
            friendlyMessage = err.message || 'Firebase authentication failed.';
            break;
        }

        showError(friendlyMessage);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    });
  }

  function saveSession(token, user, isRemember) {
    const storage = isRemember ? localStorage : sessionStorage;
    storage.setItem('ynt_admin_token', token);
    storage.setItem('ynt_admin_user', JSON.stringify(user));
  }
});
