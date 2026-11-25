import { useState, useEffect } from 'react';
import { UserProfile } from './types/index.js';
import { AuthService } from './services/api.js';
import { Dashboard } from './pages/Dashboard.js';
import { Login } from './pages/Login.js';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for token in URL (from Google OAuth callback redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
      localStorage.setItem('reachinbox_token', urlToken);
      // Clean query params from browser URL bar without page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Fetch authenticated user profile
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('reachinbox_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.warn('Auth check failed or session expired. Logging out.');
      localStorage.removeItem('reachinbox_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      localStorage.removeItem('reachinbox_token');
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Loading ReachInbox Scheduler...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={checkAuth} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
