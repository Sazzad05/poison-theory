/* ============================================================
   ADMIN LOGIN — saves token + user, redirects to dashboard
   ============================================================ */

const API = '/api';
const TOKEN_KEY = 'pt_admin_token';
const USER_KEY  = 'pt_admin_user';

const form      = document.getElementById('loginForm');
const userInput = document.getElementById('loginUser');
const passInput = document.getElementById('loginPassword');
const errEl     = document.getElementById('loginError');
const btn       = document.getElementById('loginBtn');

/* If already logged in, jump to dashboard */
if (localStorage.getItem(TOKEN_KEY)) {
  window.location.href = 'dashboard.html';
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Checking…';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: userInput.value.trim(),
        password: passInput.value,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    window.location.href = 'dashboard.html';
  } catch (err) {
    errEl.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Enter the Lab →';
  }
});