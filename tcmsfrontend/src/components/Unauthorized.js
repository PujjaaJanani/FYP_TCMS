import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const { logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(2);

  useEffect(() => {
    if (secondsLeft <= 0) {
      logout(); // clears token, calls /logout, navigates to /login
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, logout]);

  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1>403 — Not Authorized</h1>
      <p>You don't have permission to view this page.</p>
      <p>Redirecting to login in {secondsLeft}...</p>
    </div>
  );
}