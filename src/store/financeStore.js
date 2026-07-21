import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { EXCHANGE_RATES } from '../lib/utils';

export const useFinanceStore = create((set, get) => ({
  accounts: [],
  transactions: [],
  categories: [],
  budgets: [],
  goals: [],
  savingsPots: [],
  notifications: [],
  spendingLimit: null,          // { id, limit_amount, period, cooldown_hours, is_active }
  // spendingGuardState handled below
  recurringBills: [],
  momStats: null,               // { lastMonthIncome, lastMonthExpense }
  theme: localStorage.getItem('financeme-theme') || 'system',
  accentColor: localStorage.getItem('financeme-accent') || 'default',
  aiPersonality: localStorage.getItem('financeme-ai-personality') || 'professional',
  loading: {
    accounts: false,
    transactions: false,
    categories: false,
    budgets: false,
    goals: false,
    savingsPots: false,
    recurringBills: false,
    notifications: false,
  },
  spendingGuardState: {
    blocked: false,
    unblock_at: null,
    pct: 0
  },
  showBalance: true, // Default to showing balance
  setShowBalance: (show) => set({ showBalance: show }),

  // ── ACCOUNTS ──────────────────────────────────────────────
  fetchAccounts: async (userId) => {
    set((s) => ({ loading: { ...s.loading, accounts: true } }));
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (!error) set({ accounts: data });
    set((s) => ({ loading: { ...s.loading, accounts: false } }));
  },

  addAccount: async (account) => {
    const { data, error } = await supabase.from('accounts').insert(account).select().single();
    if (error) throw error;
    set((s) => ({ accounts: [...s.accounts, data] }));
    return data;
  },

  updateAccount: async (id, updates) => {
    const { data, error } = await supabase
      .from('accounts').update(updates).eq('id', id).select().single();
    if (error) throw error;
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? data : a)) }));
    return data;
  },

  deleteAccount: async (id) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
  },

  updateAccountBalance: (id, delta) => {
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === id ? { ...a, balance: a.balance + delta } : a
      ),
    }));
  },

  // ── CATEGORIES ────────────────────────────────────────────
  fetchCategories: async (userId) => {
    set((s) => ({ loading: { ...s.loading, categories: true } }));
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    if (!error) set({ categories: data });
    set((s) => ({ loading: { ...s.loading, categories: false } }));
  },

  addCategory: async (category) => {
    const { data, error } = await supabase.from('categories').insert(category).select().single();
    if (error) throw error;
    set((s) => ({ categories: [...s.categories, data] }));
    return data;
  },

  // ── TRANSACTIONS ──────────────────────────────────────────
  fetchTransactions: async (userId, filters = {}) => {
    set((s) => ({ loading: { ...s.loading, transactions: true } }));
    let query = supabase
      .from('transactions')
      .select('*, accounts(name, color, icon, type), categories(name, color, icon)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.month) {
      const [year, month] = filters.month.split('-');
      const start = `${year}-${month}-01`;
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('date', start).lte('date', end);
    }
    if (filters.account_id) query = query.eq('account_id', filters.account_id);
    if (filters.category_id) query = query.eq('category_id', filters.category_id);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.tag) query = query.contains('tags', [filters.tag]);

    const { data, error } = await query;
    if (!error) set({ transactions: data });
    set((s) => ({ loading: { ...s.loading, transactions: false } }));
  },

  fetchMoMStats: async (userId, lastMonth) => {
    const [year, month] = lastMonth.split('-');
    const start = `${year}-${month}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type, accounts(currency)')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end);
      
    if (error) return;

    let lastMonthIncome = 0;
    let lastMonthExpense = 0;
    
    data.forEach(t => {
      const rate = EXCHANGE_RATES[t.accounts?.currency || 'IDR'] || 1;
      if (t.type === 'income') lastMonthIncome += (t.amount * rate);
      if (t.type === 'expense') lastMonthExpense += (t.amount * rate);
    });

    set({ momStats: { lastMonthIncome, lastMonthExpense } });
  },

  uploadReceipt: async (file) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file);

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error('Gagal menyimpan: Bucket "receipts" belum ada di Supabase Anda. Silakan jalankan script SQL yang diberikan untuk membuatnya.');
      }
      throw uploadError;
    }

    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
    return data.publicUrl;
  },

  addTransaction: async (transaction) => {
    // Spending Guard Check
    const state = get().spendingGuardState;
    if (transaction.type === 'expense' && state?.blocked) {
      throw new Error(`Transaksi diblokir sementara. Coba lagi setelah ${new Date(state.unblock_at).toLocaleString('id-ID')}`);
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select('*, accounts(name, color, icon, type), categories(name, color, icon)')
      .single();
      
    if (error) {
      if (error.message.includes('receipt_url') || error.message.includes('schema cache')) {
        throw new Error('Gagal: Kolom "receipt_url" belum ditambahkan ke tabel "transactions". Silakan jalankan script SQL yang diberikan untuk membuatnya.');
      }
      throw error;
    }

    set((s) => ({ transactions: [data, ...s.transactions] }));

    // Update account balance
    const delta = transaction.type === 'income' ? transaction.amount : -transaction.amount;
    await supabase.rpc('update_account_balance', { account_id: transaction.account_id, delta });
    get().updateAccountBalance(transaction.account_id, delta);

    // Re-check spending guard and notify if needed
    if (state && transaction.type === 'expense') {
      const prevTotal = state.totalSpent || 0;
      const newTotal = prevTotal + transaction.amount;
      const limitAmt = get().spendingLimit?.limit_amount || 1;
      const prevPct = (prevTotal / limitAmt) * 100;
      const newPct = (newTotal / limitAmt) * 100;

      if (newPct >= 100 && prevPct < 100) {
        get().addNotification({
          user_id: transaction.user_id,
          title: 'Batas Anggaran Tercapai!',
          message: `Anda telah melebihi batas anggaran ${get().spendingLimit?.period === 'daily' ? 'harian' : 'mingguan'}. Transaksi akan diblokir sementara.`,
          type: 'danger'
        });
      } else if (newPct >= 80 && prevPct < 80) {
        get().addNotification({
          user_id: transaction.user_id,
          title: 'Peringatan Anggaran',
          message: `Pengeluaran Anda sudah mencapai ${Math.round(newPct)}% dari batas yang ditentukan.`,
          type: 'warning'
        });
      }
    }

    // Trigger confetti 🎉
    import('canvas-confetti').then((confetti) => {
      confetti.default({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: transaction.type === 'income' ? ['#10b981', '#34d399', '#ffffff'] : ['#6366f1', '#a855f7', '#ffffff']
      });
    });

    return data;
  },

  updateTransaction: async (id, updates) => {
    const original = get().transactions.find((t) => t.id === id);
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select('*, accounts(name, color, icon, type), categories(name, color, icon)')
      .single();
    if (error) throw error;

    set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? data : t)) }));

    // Adjust balance: revert old, apply new
    if (original) {
      const oldDelta = original.type === 'income' ? original.amount : -original.amount;
      const newDelta = data.type === 'income' ? data.amount : -data.amount;
      const netDelta = newDelta - oldDelta;
      if (netDelta !== 0 && original.account_id === data.account_id) {
        await supabase.rpc('update_account_balance', { account_id: data.account_id, delta: netDelta });
        get().updateAccountBalance(data.account_id, netDelta);
      }
    }
    return data;
  },

  deleteTransaction: async (id) => {
    const transaction = get().transactions.find((t) => t.id === id);

    // If this is a transfer, also delete the paired transaction
    if (transaction?.transfer_id) {
      const paired = get().transactions.find((t) => t.id === transaction.transfer_id);
      if (paired) {
        await supabase.from('transactions').delete().eq('id', paired.id);
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== paired.id) }));
        // Reverse paired balance
        const pairedDelta = paired.type === 'income' ? -paired.amount : paired.amount;
        await supabase.rpc('update_account_balance', { account_id: paired.account_id, delta: pairedDelta });
        get().updateAccountBalance(paired.account_id, pairedDelta);
      }
    }

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;

    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));

    // Reverse balance
    if (transaction) {
      const delta = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      await supabase.rpc('update_account_balance', { account_id: transaction.account_id, delta });
      get().updateAccountBalance(transaction.account_id, delta);
    }
  },

  // ── TRANSFER ANTAR AKUN ───────────────────────────────────
  addTransfer: async ({ fromAccountId, toAccountId, amount, note, date, userId }) => {
    if (fromAccountId === toAccountId) throw new Error('Akun asal dan tujuan tidak boleh sama');
    if (!amount || amount <= 0) throw new Error('Jumlah transfer harus lebih dari 0');

    const fromAccount = get().accounts.find(a => a.id === fromAccountId);
    const toAccount = get().accounts.find(a => a.id === toAccountId);
    if (!fromAccount || !toAccount) throw new Error('Akun tidak ditemukan');
    if (fromAccount.balance < amount) throw new Error(`Saldo ${fromAccount.name} tidak mencukupi`);

    const transferDate = date || new Date().toISOString().split('T')[0];
    const description = note || `Transfer ke ${toAccount.name}`;
    const descriptionIn = note || `Transfer dari ${fromAccount.name}`;

    // Step 1: Insert the "out" transaction (source)
    const { data: outTx, error: outError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: fromAccountId,
        type: 'expense',
        transfer_type: 'transfer_out',
        amount,
        description,
        date: transferDate,
        category_id: null,
      })
      .select('*, accounts(name, color, icon, type)')
      .single();
    if (outError) throw outError;

    // Step 2: Insert the "in" transaction (destination), linking to outTx
    const { data: inTx, error: inError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: toAccountId,
        type: 'income',
        transfer_type: 'transfer_in',
        transfer_id: outTx.id,
        amount,
        description: descriptionIn,
        date: transferDate,
        category_id: null,
      })
      .select('*, accounts(name, color, icon, type)')
      .single();
    if (inError) {
      // Rollback the out transaction if in fails
      await supabase.from('transactions').delete().eq('id', outTx.id);
      throw inError;
    }

    // Step 3: Update outTx with transfer_id pointing to inTx
    await supabase.from('transactions').update({ transfer_id: inTx.id }).eq('id', outTx.id);

    // Update local state
    const outTxFinal = { ...outTx, transfer_id: inTx.id };
    set((s) => ({ transactions: [inTx, outTxFinal, ...s.transactions] }));

    // Update both account balances
    await supabase.rpc('update_account_balance', { account_id: fromAccountId, delta: -amount });
    await supabase.rpc('update_account_balance', { account_id: toAccountId, delta: amount });
    get().updateAccountBalance(fromAccountId, -amount);
    get().updateAccountBalance(toAccountId, amount);

    return { outTx: outTxFinal, inTx };
  },

  // ── BUDGETS ───────────────────────────────────────────────
  fetchBudgets: async (userId, month) => {
    set((s) => ({ loading: { ...s.loading, budgets: true } }));
    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(name, color, icon)')
      .eq('user_id', userId)
      .eq('month', month);
    if (!error) set({ budgets: data });
    set((s) => ({ loading: { ...s.loading, budgets: false } }));
  },

  addBudget: async (budget) => {
    const { data, error } = await supabase
      .from('budgets')
      .insert(budget)
      .select('*, categories(name, color, icon)')
      .single();
    if (error) throw error;
    set((s) => ({ budgets: [...s.budgets, data] }));
    return data;
  },

  updateBudget: async (id, updates) => {
    const { data, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select('*, categories(name, color, icon)')
      .single();
    if (error) throw error;
    set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? data : b)) }));
    return data;
  },

  deleteBudget: async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
  },

  // ── GOALS ───────────────────────────────────────────────
  fetchGoals: async (userId) => {
    set((s) => ({ loading: { ...s.loading, goals: true } }));
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (!error) set({ goals: data });
    set((s) => ({ loading: { ...s.loading, goals: false } }));
  },

  addGoal: async (goal) => {
    const { data, error } = await supabase.from('goals').insert(goal).select().single();
    if (error) throw error;
    set((s) => ({ goals: [...s.goals, data] }));
    return data;
  },

  updateGoal: async (id, updates) => {
    const { data, error } = await supabase
      .from('goals').update(updates).eq('id', id).select().single();
    if (error) throw error;
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? data : g)) }));
    return data;
  },

  deleteGoal: async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
  },

  // ── RECURRING BILLS ───────────────────────────────────────────────
  fetchRecurringBills: async (userId) => {
    set((s) => ({ loading: { ...s.loading, recurringBills: true } }));
    const { data, error } = await supabase
      .from('recurring_bills')
      .select('*, accounts(name, color, icon), categories(name, color, icon)')
      .eq('user_id', userId)
      .order('due_date');
    if (!error) set({ recurringBills: data });
    set((s) => ({ loading: { ...s.loading, recurringBills: false } }));
  },

  addRecurringBill: async (bill) => {
    const { data, error } = await supabase.from('recurring_bills').insert(bill).select('*, accounts(name, color, icon), categories(name, color, icon)').single();
    if (error) throw error;
    set((s) => ({ recurringBills: [...s.recurringBills, data] }));
    return data;
  },

  updateRecurringBill: async (id, updates) => {
    const { data, error } = await supabase
      .from('recurring_bills').update(updates).eq('id', id).select('*, accounts(name, color, icon), categories(name, color, icon)').single();
    if (error) throw error;
    set((s) => ({ recurringBills: s.recurringBills.map((r) => (r.id === id ? data : r)) }));
    return data;
  },

  deleteRecurringBill: async (id) => {
    const { error } = await supabase.from('recurring_bills').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ recurringBills: s.recurringBills.filter((r) => r.id !== id) }));
  },

  processRecurringBills: async (userId) => {
    const { data: bills, error: fetchError } = await supabase
      .from('recurring_bills')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
      
    if (fetchError || !bills) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const bill of bills) {
      const nextDue = new Date(bill.next_due);
      nextDue.setHours(0, 0, 0, 0);
      
      if (nextDue <= today) {
        // Create transaction
        const tx = {
          user_id: userId,
          amount: bill.amount,
          type: bill.type,
          category_id: bill.category_id,
          account_id: bill.account_id,
          description: `Auto-pay: ${bill.name}`,
          date: nextDue.toISOString().split('T')[0]
        };
        
        try {
          // Use internal method to add transaction (which handles balances etc)
          await get().addTransaction(tx);
          
          // Calculate new next_due
          const newNextDue = new Date(nextDue);
          if (bill.frequency === 'daily') newNextDue.setDate(newNextDue.getDate() + 1);
          if (bill.frequency === 'weekly') newNextDue.setDate(newNextDue.getDate() + 7);
          if (bill.frequency === 'monthly') newNextDue.setMonth(newNextDue.getMonth() + 1);
          if (bill.frequency === 'yearly') newNextDue.setFullYear(newNextDue.getFullYear() + 1);
          
          // Update bill
          await get().updateRecurringBill(bill.id, {
            last_paid: nextDue.toISOString().split('T')[0],
            next_due: newNextDue.toISOString().split('T')[0]
          });
          
          // Notify
          get().addNotification({
            user_id: userId,
            title: 'Tagihan Rutin Dibayar',
            message: `${bill.name} sebesar Rp ${bill.amount.toLocaleString('id-ID')} telah dipotong dari akun Anda.`,
            type: 'info'
          });
        } catch (e) {
          console.error('Failed to process bill', bill.id, e);
          get().addNotification({
            user_id: userId,
            title: 'Gagal Membayar Tagihan',
            message: `Gagal memproses pembayaran otomatis untuk ${bill.name}.`,
            type: 'danger'
          });
        }
      }
    }
  },

  // ── NOTIFICATIONS ────────────────────────────────────────────────
  fetchNotifications: async (userId) => {
    set((s) => ({ loading: { ...s.loading, notifications: true } }));
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error) set({ notifications: data });
    set((s) => ({ loading: { ...s.loading, notifications: false } }));
  },

  addNotification: async (notification) => {
    // Attempt browser notification if supported and granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, { body: notification.message });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();
    if (!error) {
      set((s) => ({ notifications: [data, ...s.notifications] }));
    }
  },

  markNotificationAsRead: async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (!error) {
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      }));
    }
  },

  markAllNotificationsAsRead: async (userId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (!error) {
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      }));
    }
  },

  // ── COMPUTED ──────────────────────────────────────────────
  getTotalBalance: () => {
    return get().accounts.reduce((sum, a) => {
      const currency = a.currency || 'IDR';
      const rate = EXCHANGE_RATES[currency] || 1;
      return sum + ((a.balance || 0) * rate);
    }, 0);
  },

  getMonthSummary: (month) => {
    const [year, mon] = month.split('-');
    const txs = get().transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === Number(year) && d.getMonth() + 1 === Number(mon);
    });
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense, transactions: txs };
  },

  getCategorySpending: (month) => {
    const { transactions } = get();
    const [year, mon] = month.split('-');
    const txs = transactions.filter((t) => {
      const d = new Date(t.date);
      return (
        t.type === 'expense' &&
        d.getFullYear() === Number(year) &&
        d.getMonth() + 1 === Number(mon)
      );
    });
    const map = {};
    txs.forEach((t) => {
      const key = t.category_id;
      if (!map[key]) {
        map[key] = {
          category_id: key,
          name: t.categories?.name || 'Lainnya',
          color: t.categories?.color || '#6b7280',
          icon: t.categories?.icon || 'other_expense',
          total: 0,
        };
      }
      map[key].total += t.amount;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  },

  // ── SAVINGS POTS ────────────────────────────────────────────
  fetchSavingsPots: async (userId) => {
    set((s) => ({ loading: { ...s.loading, savingsPots: true } }));
    const { data, error } = await supabase
      .from('savings_pots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (!error) set({ savingsPots: data });
    set((s) => ({ loading: { ...s.loading, savingsPots: false } }));
  },

  addSavingsPot: async (pot) => {
    const { data, error } = await supabase.from('savings_pots').insert(pot).select().single();
    if (error) throw error;
    set((s) => ({ savingsPots: [...s.savingsPots, data] }));
    return data;
  },

  updateSavingsPot: async (id, updates) => {
    const { data, error } = await supabase
      .from('savings_pots').update(updates).eq('id', id).select().single();
    if (error) throw error;
    set((s) => ({ savingsPots: s.savingsPots.map((p) => (p.id === id ? data : p)) }));
    return data;
  },

  deleteSavingsPot: async (id) => {
    const { error } = await supabase.from('savings_pots').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ savingsPots: s.savingsPots.filter((p) => p.id !== id) }));
  },

  topUpSavingsPot: async (potId, amount, accountId) => {
    const pot = get().savingsPots.find((p) => p.id === potId);
    if (!pot) throw new Error('Celengan tidak ditemukan');
    const account = get().accounts.find((a) => a.id === accountId);
    if (!account) throw new Error('Akun tidak ditemukan');
    if (account.balance < amount) throw new Error('Saldo akun tidak cukup');

    // Deduct from account
    await supabase.rpc('update_account_balance', { account_id: accountId, delta: -amount });
    get().updateAccountBalance(accountId, -amount);

    // Increase pot amount
    const newAmount = pot.current_amount + amount;
    await get().updateSavingsPot(potId, { current_amount: newAmount });
  },

  withdrawSavingsPot: async (potId, amount, accountId) => {
    const pot = get().savingsPots.find((p) => p.id === potId);
    if (!pot) throw new Error('Celengan tidak ditemukan');
    if (pot.current_amount < amount) throw new Error('Saldo celengan tidak cukup');

    // Increase account balance
    await supabase.rpc('update_account_balance', { account_id: accountId, delta: amount });
    get().updateAccountBalance(accountId, amount);

    // Decrease pot amount
    const newAmount = pot.current_amount - amount;
    await get().updateSavingsPot(potId, { current_amount: newAmount });
  },

  // ── SPENDING GUARD ──────────────────────────────────────────
  fetchSpendingLimit: async (userId) => {
    const { data } = await supabase
      .from('spending_limits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    set({ spendingLimit: data || null });
    // Check guard state
    if (data?.is_active) {
      get().checkSpendingGuard(userId, data);
    }
  },

  upsertSpendingLimit: async (userId, form) => {
    const existing = get().spendingLimit;
    let data, error;
    if (existing?.id) {
      ({ data, error } = await supabase
        .from('spending_limits').update(form).eq('id', existing.id).select().single());
    } else {
      ({ data, error } = await supabase
        .from('spending_limits').insert({ ...form, user_id: userId }).select().single());
    }
    if (error) throw error;
    set({ spendingLimit: data });
    return data;
  },

  updateSpendingGuardState: (stateUpdate) => {
    set(state => ({
      spendingGuardState: {
        ...state.spendingGuardState,
        ...stateUpdate
      }
    }));
  },

  setTheme: (theme) => {
    localStorage.setItem('financeme-theme', theme);
    set({ theme });
  },

  setAccentColor: (accentColor) => {
    localStorage.setItem('financeme-accent', accentColor);
    document.documentElement.setAttribute('data-accent', accentColor);
    set({ accentColor });
  },

  setAiPersonality: (aiPersonality) => {
    localStorage.setItem('financeme-ai-personality', aiPersonality);
    set({ aiPersonality });
  },

  checkSpendingGuard: (userId, limit) => {
    if (!limit?.is_active) {
      set({ spendingGuardState: null });
      return;
    }
    const now = new Date();
    const txs = get().transactions;
    let periodStart;
    if (limit.period === 'daily') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      // weekly: monday of current week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      periodStart = new Date(now.setDate(diff));
      periodStart.setHours(0, 0, 0, 0);
    }

    const totalSpent = txs
      .filter(t => t.type === 'expense' && new Date(t.date) >= periodStart)
      .reduce((s, t) => s + t.amount, 0);

    if (totalSpent >= limit.limit_amount) {
      // Find the most recent expense to calculate unblock time
      const lastExpense = txs
        .filter(t => t.type === 'expense' && new Date(t.date) >= periodStart)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      const unblockAt = lastExpense
        ? new Date(new Date(lastExpense.created_at).getTime() + limit.cooldown_hours * 3600000)
        : new Date();
      const isBlocked = new Date() < unblockAt;
      set({ spendingGuardState: { blocked: isBlocked, unblock_at: unblockAt.toISOString(), totalSpent } });
    } else {
      const pct = limit.limit_amount > 0 ? (totalSpent / limit.limit_amount) * 100 : 0;
      set({ spendingGuardState: { blocked: false, pct, totalSpent } });
    }
  },
}));
