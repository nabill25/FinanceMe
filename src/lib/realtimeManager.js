/**
 * Supabase Realtime Manager
 * Subscribes to database changes and syncs the Zustand store automatically.
 */
import { supabase } from './supabase';

let channel = null;

/**
 * Subscribe to realtime changes for a user's data.
 * @param {string} userId
 * @param {object} store - The useFinanceStore instance
 */
export function subscribeToRealtime(userId, store) {
  // Cleanup existing subscription
  if (channel) {
    supabase.removeChannel(channel);
  }

  channel = supabase
    .channel(`finance_realtime_${userId}`)

    // ACCOUNTS
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'accounts',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      store.setState((s) => {
        const exists = s.accounts.some(a => a.id === payload.new.id);
        if (exists) return {};
        return { accounts: [...s.accounts, payload.new] };
      });
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'accounts',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      store.setState((s) => ({
        accounts: s.accounts.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a),
      }));
    })
    .on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'accounts',
    }, (payload) => {
      store.setState((s) => ({
        accounts: s.accounts.filter(a => a.id !== payload.old.id),
      }));
    })

    // TRANSACTIONS — refresh list on change (to get joined data)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'transactions',
      filter: `user_id=eq.${userId}`,
    }, () => {
      // Re-fetch so we get the joined category/account names
      store.getState().fetchTransactions(userId, {});
    })

    // BUDGETS
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'budgets',
      filter: `user_id=eq.${userId}`,
    }, () => {
      const { getCurrentMonth } = store.getState();
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      store.getState().fetchBudgets(userId, month);
    })

    // GOALS
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'goals',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      store.setState((s) => {
        const exists = s.goals.some(g => g.id === payload.new.id);
        if (exists) return {};
        return { goals: [...s.goals, payload.new] };
      });
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'goals',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      store.setState((s) => ({
        goals: s.goals.map(g => g.id === payload.new.id ? { ...g, ...payload.new } : g),
      }));
    })
    .on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'goals',
    }, (payload) => {
      store.setState((s) => ({
        goals: s.goals.filter(g => g.id !== payload.old.id),
      }));
    })

    // SAVINGS POTS
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'savings_pots',
      filter: `user_id=eq.${userId}`,
    }, () => {
      store.getState().fetchSavingsPots?.(userId);
    })

    // NOTIFICATIONS
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      store.setState((s) => {
        // Show browser notification if possible
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(payload.new.title, { body: payload.new.message });
        }
        return { notifications: [payload.new, ...s.notifications] };
      });
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      store.setState((s) => ({
        notifications: s.notifications.map(n => n.id === payload.new.id ? payload.new : n)
      }));
    })

    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Realtime tracking active for user ${userId}`);
      }
    });

  return channel;
}

export function unsubscribeFromRealtime() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}
