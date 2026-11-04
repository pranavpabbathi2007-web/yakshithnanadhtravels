/**
 * YAKSHITH NANDH TRAVELS - Admin Login Authentication
 * Supports full-stack Node.js SQLite API + seamless static/offline fallback
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('adminLoginForm');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');
  const rememberMe = document.getElementById('rememberMe');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const alertBox = document.getElementById('loginAlert');
  const alertText = document.getElementById('loginAlertText');

  // 1. Auto-redirect if already authenticated
  const existingToken = localStorage.getItem('ynt_admin_token') || sessionStorage.getItem('ynt_admin_token');
  if (existingToken) {
    // Check if token is valid or recent
    window.location.replace('/admin');
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

  // 3. Show error helper
  const showError = (message) => {
    alertText.textContent = message || 'Invalid email or password.';
    alertBox.classList.add('visible');
    passwordInput.value = '';
    passwordInput.focus();
    // re-trigger shake animation
    alertBox.style.animation = 'none';
    alertBox.offsetHeight; // trigger reflow
    alertBox.style.animation = 'shake 0.3s ease';
  };

  const hideError = () => {
    alertBox.classList.remove('visible');
  };

  emailInput.addEventListener('input', hideError);
  passwordInput.addEventListener('input', hideError);

  // 4. Form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      if (!email || !password) {
        showError('Please enter both email and password.');
        return;
      }

      // Button loading state
      const originalBtnHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg style="animation:spin 1s linear infinite; width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24">
          <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8zm0 16c4.41 0 8-3.59 8-8h2c0 5.52-4.48 10-10 10v-2z"/>
        </svg>
        <span>Verifying...</span>
      `;

      try {
        // Try backend API authentication
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.token) {
            saveSession(data.token, data.user, rememberMe.checked);
            window.location.replace('/admin');
            return;
          }
        } else if (res.status === 401) {
          const errData = await res.json();
          showError(errData.error || 'Invalid email or password.');
          return;
        } else {
          // Non-401 backend response -> try local fallback
          checkLocalFallback(email, password, rememberMe.checked);
        }
      } catch (networkErr) {
        // Backend not reachable (e.g. GitHub Pages or offline) -> check local fallback
        checkLocalFallback(email, password, rememberMe.checked);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    });
  }

  // Local fallback authentication
  function checkLocalFallback(email, password, isRemember) {
    const validEmails = [
      'admin@yakshithnandhtravels.com',
      'admin@gmail.com',
      'admin'
    ];
    const validPasswords = ['admin', 'Yakshith@2026', 'admin123'];

    const emailMatch = validEmails.includes(email);
    const passwordMatch = validPasswords.includes(password);

    if (emailMatch && passwordMatch) {
      const fallbackToken = 'ynt_auth_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const user = {
        name: 'Master Dispatcher',
        email: email,
        role: 'admin'
      };
      saveSession(fallbackToken, user, isRemember);
      window.location.replace('/admin');
    } else {
      showError('Invalid email or password. Default: admin@yakshithnandhtravels.com / admin');
    }
  }

  function saveSession(token, user, isRemember) {
    const storage = isRemember ? localStorage : sessionStorage;
    storage.setItem('ynt_admin_token', token);
    storage.setItem('ynt_admin_user', JSON.stringify(user || { name: 'Admin', email: 'admin' }));
  }
});
