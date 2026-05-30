/**
 * auth.js — AEGIS JWT Authentication Module
 * Handles login, token storage, auth guards, and logout.
 * Pointed to the Express unified backend on Port 5000.
 */

// ── API URL Detection ──────────────────────────────────────────
const API_URL = (window.location.protocol === 'file:' || window.location.hostname === '')
  ? 'http://localhost:5000'
  : window.location.origin;

// ── Token Helpers ──────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('access_token');
}

function checkAuth() {
  const token = getToken();
  const isLoginPage = window.location.pathname.endsWith('login.html') || 
                      window.location.pathname === '/login' ||
                      window.location.pathname === '/login.html' ||
                      window.location.pathname === '/';
  
  console.log(`[AUTH_GUARD] Path: ${window.location.pathname} | Token: ${token ? 'PRESENT' : 'MISSING'}`);

  if (!token && !isLoginPage) {
    if (window.location.protocol === 'file:') {
      console.warn("[AUTH_GUARD] Local file detected. Ensuring persistence...");
    }
    window.location.href = 'login.html';
  }
}

function logout() {
  localStorage.removeItem('access_token');
  window.location.href = 'login.html';
}

// ── Login Form Handler ─────────────────────────────────────────

async function initAuth() {
  const form = document.getElementById('login-form');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "true";

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('error-msg');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (errorEl) errorEl.style.display = 'none';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'AUTHENTICATING...';
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        if (submitBtn) submitBtn.textContent = 'ACCESS GRANTED ✓';
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 400);
      } else {
        if (errorEl) {
          errorEl.textContent = 'ACCESS DENIED — Invalid Credentials';
          errorEl.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'AUTHENTICATE';
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      if (errorEl) {
        errorEl.textContent = 'CONNECTION FAILED — Backend Unreachable';
        errorEl.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'AUTHENTICATE';
      }
    }
  });
}

// Initialize auth logic
document.addEventListener('DOMContentLoaded', () => {
  const isLoginPage = window.location.pathname.endsWith('login.html') ||
                      window.location.pathname === '/login' ||
                      window.location.pathname === '/login.html';

  if (!isLoginPage) {
    checkAuth();
  }

  initAuth();
});
