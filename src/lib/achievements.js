import { isSameDay, subDays } from 'date-fns';

export const MEDALS = [
  {
    id: 'first_transaction',
    title: 'Langkah Pertama 👶',
    desc: 'Mencatat transaksi pertama Anda di FinanceMe.',
    color: '#3b82f6'
  },
  {
    id: 'zero_spend',
    title: 'Zero Spend Day 🛡️',
    desc: 'Tidak ada pengeluaran sama sekali hari ini.',
    color: '#10b981'
  },
  {
    id: 'budget_master',
    title: 'Budget Master 🎯',
    desc: 'Pengeluaran masih aman di bawah batas budget.',
    color: '#8b5cf6'
  },
  {
    id: 'wealth_builder',
    title: 'Wealth Builder 💰',
    desc: 'Total saldo menyentuh lebih dari Rp 10 Juta.',
    color: '#f59e0b'
  },
  {
    id: 'streak_3',
    title: 'Konsisten 3 Hari 🔥',
    desc: 'Mencatat transaksi 3 hari berturut-turut.',
    color: '#ef4444'
  }
];

export function calculateAchievements(transactions, budgets, totalBalance) {
  const unlocked = [];
  const today = new Date();

  // 1. First Transaction
  if (transactions.length > 0) {
    unlocked.push('first_transaction');
  }

  // 2. Zero Spend Day (Today)
  const expensesToday = transactions.filter(t => 
    t.type === 'expense' && isSameDay(new Date(t.date), today)
  );
  if (transactions.length > 0 && expensesToday.length === 0) {
    unlocked.push('zero_spend');
  }

  // 3. Budget Master (Has active budgets and none are exceeded)
  if (budgets.length > 0) {
    let allSafe = true;
    for (const b of budgets) {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category_id === b.category_id)
        .reduce((sum, t) => sum + t.amount, 0);
      if (spent >= b.amount) {
        allSafe = false;
        break;
      }
    }
    if (allSafe) {
      unlocked.push('budget_master');
    }
  }

  // 4. Wealth Builder
  if (totalBalance >= 10000000) {
    unlocked.push('wealth_builder');
  }

  // 5. Streak 3 Days
  if (transactions.length >= 3) {
    const hasToday = transactions.some(t => isSameDay(new Date(t.date), today));
    const hasYesterday = transactions.some(t => isSameDay(new Date(t.date), subDays(today, 1)));
    const has2DaysAgo = transactions.some(t => isSameDay(new Date(t.date), subDays(today, 2)));
    if (hasToday && hasYesterday && has2DaysAgo) {
      unlocked.push('streak_3');
    }
  }

  return unlocked;
}
