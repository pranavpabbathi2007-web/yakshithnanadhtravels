/**
 * YAKSHITH NANDH TRAVELS - Admin Login & Firebase Auth Manager
 * Uses Firebase Authentication & Cloud Firestore (yakshithnandhtravels)
 */

import {
  auth,
  loginAdminWithFirebase,
  createAdminWithFirebase
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('adminLoginForm');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');
  const displayNameInput = document.getElementById('adminDisplayName');
  const groupDisplayName = document.getElementById('groupDisplayName');
  const rememberMe = document.getElementById('rememberMe');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const btnSubmitText = document.getElementById('btnSubmitText');
  const alertBox = document.getElementById('loginAlert');
  const alertText = document.getElementById('loginAlertText');

  const tabSignIn = document.getElementById('tabSignIn');
  const tabRegister = document.getElementById('tabRegister');
  let isRegisterMode = false;

  // 1. Check existing session
  const existingToken = localStorage.getItem('ynt_admin_token') || sessionStorage.getItem('ynt_admin_token');
  if (existingToken) {
    window.location.replace('/admin');
    return;
  }

  // 2. Tab switching (Sign In vs Register in Firebase)
  if (tabSignIn && tabRegister) {
    tabSignIn.addEventListener('click', () => {
      isRegisterMode = false;
      tabSignIn.classList.add('active');
      tabRegister.classList.remove('active');
      groupDisplayName.style.display = 'none';
      btnSubmitText.textContent = 'Sign In to Console';
      hideError();
    });

    tabRegister.addEventListener('click', () => {
      isRegisterMode = true;
      tabRegister.classList.add('active');
      tabSignIn.classList.remove('active');
      groupDisplayName.style.display = 'block';
      btnSubmitText.textContent = 'Create Admin in Firebase';
      hideError();
    });
  }

  // 3. Password visibility toggle
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      togglePasswordBtn.style.color = isPass ? 'var(--color-primary)' : 'var(--color-text-muted)';
    });
  }

  // 4. Alert Helpers
  const showError = (msg) => {
    alertBox.classList.remove('success');
    alertBox.classList.add('visible');
    alertText.textContent = msg || 'Invalid email or password.';
    alertBox.style.animation = 'none';
    alertBox.offsetHeight;
    alertBox.style.animation = 'shake 0.3s ease';
  };

  const showSuccess = (msg) => {
    alertBox.classList.add('success');
    alertBox.classList.add('visible');
    alertText.textContent = msg;
  };

  const hideError = () => {
    alertBox.classList.remove('visible', 'success');
  };

  emailInput.addEventListener('input', hideError);
  passwordInput.addEventListener('input', hideError);

  // 5. Submit Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const displayName = displayNameInput ? displayNameInput.value.trim() : 'Master Dispatcher';

      if (!email || !password) {
        showError('Please enter your email and password.');
        return;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
      }

      const originalBtnHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:8px;">
          <svg style="animation:spin 1s linear infinite; width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24">
            <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8zm0 16c4.41 0 8-3.59 8-8h2c0 5.52-4.48 10-10 10v-2z"/>
          </svg>
          <span>Connecting to Firebase...</span>
        </span>
      `;

      try {
        if (isRegisterMode) {
          // --- Register New Admin in Firebase ---
          const res = await createAdminWithFirebase(email, password, displayName);
          showSuccess('Admin account created in Firebase! Redirecting...');
          saveSession(res.token, res.adminProfile, rememberMe.checked);
          setTimeout(() => window.location.replace('/admin'), 1200);
          return;
        } else {
          // --- Sign In with Firebase Authentication ---
          try {
            const res = await loginAdminWithFirebase(email, password);
            saveSession(res.token, res.adminProfile, rememberMe.checked);
            window.location.replace('/admin');
            return;
          } catch (firebaseAuthErr) {
            console.warn('Firebase Auth notice:', firebaseAuthErr.code, firebaseAuthErr.message);

            // If account not found or wrong password in Firebase, check local/backend
            if (
              firebaseAuthErr.code === 'auth/user-not-found' ||
              firebaseAuthErr.code === 'auth/invalid-credential' ||
              firebaseAuthErr.code === 'auth/operation-not-allowed' ||
              firebaseAuthErr.code === 'auth/network-request-failed'
            ) {
              // Try local server or fallback verification
              const localSuccess = await tryLocalOrServerAuth(email, password);
              if (localSuccess) {
                window.location.replace('/admin');
                return;
              }

              if (firebaseAuthErr.code === 'auth/operation-not-allowed') {
                showError('Firebase Email/Password provider is not yet enabled in Firebase Console. Using local login credentials.');
              } else if (firebaseAuthErr.code === 'auth/user-not-found' || firebaseAuthErr.code === 'auth/invalid-credential') {
                showError('Admin account not found in Firebase. Click "Register in Firebase" tab above to create it.');
              } else {
                showError('Firebase error: ' + firebaseAuthErr.message);
              }
              return;
            }

            throw firebaseAuthErr;
          }
        }
      } catch (err) {
        showError(err.message || 'Authentication failed. Please check credentials.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    });
  }

  // Local/Backend server auth fallback
  async function tryLocalOrServerAuth(email, password) {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        saveSession(data.token, data.user, rememberMe.checked);
        return true;
      }
    } catch (e) {}

    const validEmails = ['admin@yakshithnandhtravels.com', 'admin@gmail.com', 'admin'];
    const validPasswords = ['admin', 'admin123', 'Yakshith@2026'];
    if (validEmails.includes(email) && validPasswords.includes(password)) {
      const fallbackToken = 'ynt_auth_' + Date.now();
      saveSession(fallbackToken, { name: 'Master Dispatcher', email, source: 'local' }, rememberMe.checked);
      return true;
    }
    return false;
  }

  function saveSession(token, user, isRemember) {
    const storage = isRemember ? localStorage : sessionStorage;
    storage.setItem('ynt_admin_token', token);
    storage.setItem('ynt_admin_user', JSON.stringify(user || { name: 'Admin', email: 'admin' }));
  }
});
