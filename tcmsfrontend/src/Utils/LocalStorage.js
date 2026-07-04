// src/utils/LocalStorage.js
// Centralised helpers for reading / writing auth data in localStorage.
// Import these functions anywhere instead of calling localStorage directly.

// ─────────────────────────────────────────────
// SAVE  (called right after a successful login)
// ─────────────────────────────────────────────

/**
 * Persist the token and full user object returned by the API.
 * @param {string} token
 * @param {object} user  – the user object from response.data.data.user
 */
export const saveAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.removeItem('userType');
  localStorage.removeItem('role');
};

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

/** @returns {string|null} Bearer token */
export const getToken = () => localStorage.getItem('token');

/** @returns {object|null} Full user object */
export const getUser = () => {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
};

/**
 * @returns {'authority'|'student'|null}
 */
export const getUserType = () => getUser()?.userType ?? null;

/**
 * @returns {'Admin'|'Staff'|'student'|null}
 */
export const getRole = () => getUser()?.role ?? null;

// ─────────────────────────────────────────────
// ROLE CHECKS  (boolean helpers)
// ─────────────────────────────────────────────

export const isAdmin   = () => getRole() === 'Admin';
export const isStaff   = () => getRole() === 'Staff';
export const isStudent = () => getUserType() === 'student';
export const isLoggedIn = () => !!getToken();

// ─────────────────────────────────────────────
// CLEAR  (called on logout)
// ─────────────────────────────────────────────

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userType');
  localStorage.removeItem('role');
};
