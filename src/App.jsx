import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { useFinanceStore } from './store/financeStore';
import { subscribeToRealtime, unsubscribeFromRealtime } from './lib/realtimeManager';

import Layout from './components/layout/Layout';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AccountsPage from './pages/Accounts';
import TransactionsPage from './pages/Transactions';
import BudgetPage from './pages/Budget';
import ReportsPage from './pages/Reports';
import DecisionHelper from './pages/DecisionHelper';
import GoalsPage from './pages/Goals';
import SavingsPage from './pages/Savings';
import SettingsPage from './pages/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span className="spinner spinner-lg" />
      </div>
    );
  }
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  const { setSession, setLoading } = useAuthStore();
  const financeStore = useFinanceStore;

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);

      if (session?.user) {
        // Start realtime subscriptions when user logs in
        subscribeToRealtime(session.user.id, financeStore);
      } else {
        // Cleanup when user logs out
        unsubscribeFromRealtime();
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeFromRealtime();
    };
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          },
        }}
      />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/accounts" element={<AccountsPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/savings" element={<SavingsPage />} />
                  <Route path="/budget" element={<BudgetPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/decision" element={<DecisionHelper />} />
                  <Route path="/goals" element={<GoalsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

