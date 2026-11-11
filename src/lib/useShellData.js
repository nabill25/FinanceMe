import { useMemo } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { getCurrentMonth } from './utils';

const localDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Tema yang benar-benar tampil + fungsi untuk berganti terang/gelap. */
export function useThemeToggle() {
  const { theme, setTheme } = useFinanceStore();
  const isDark = theme === 'dark' || theme === 'dark-amoled'
    || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return { isDark, toggleTheme: () => setTheme(isDark ? 'light' : 'dark') };
}

/** Inisial & nama depan pengguna untuk avatar dan sapaan. */
export function useUserIdentity() {
  const { user } = useAuthStore();
  const fullName = user?.user_metadata?.full_name || '';
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';
  return { user, fullName, firstName: fullName.split(' ')[0] || '', initials };
}

/**
 * Angka ringkas untuk sidebar:
 * - "Aman dibelanjakan hari ini" = (saldo semua akun − tagihan rutin yang belum dibayar
 *   sampai akhir bulan) ÷ sisa hari di bulan ini.
 * - Badge: tagihan jatuh tempo ≤ 7 hari & kategori yang melewati anggaran.
 */
export function useShellData() {
  const { accounts, recurringBills, budgets, transactions, getTotalBalance, getCategorySpending } = useFinanceStore();

  return useMemo(() => {
    const now = new Date();
    const today = localDateStr(now);
    const endOfMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfMonth = localDateStr(endOfMonthDate);
    const in7Days = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
    const daysLeft = endOfMonthDate.getDate() - now.getDate() + 1;

    const activeBills = recurringBills.filter((b) => b.is_active && b.next_due);
    const billsDue = activeBills
      .filter((b) => b.next_due >= today && b.next_due <= endOfMonth)
      .reduce((s, b) => s + Number(b.amount || 0), 0);
    const billsSoon = activeBills.filter((b) => b.next_due <= in7Days).length;

    const spending = getCategorySpending(getCurrentMonth());
    const overBudget = budgets.filter((b) => {
      const spent = spending.find((c) => c.category_id === b.category_id)?.total || 0;
      return b.amount > 0 && spent > b.amount;
    }).length;

    const available = getTotalBalance() - billsDue;
    return {
      hasAccounts: accounts.length > 0,
      safeToday: Math.max(0, available / daysLeft),
      isShort: available < 0,
      billsDue,
      daysLeft,
      badges: { bills: billsSoon, budgets: overBudget },
    };
    // transactions ikut sebagai dependensi karena getCategorySpending membaca data itu
  }, [accounts, recurringBills, budgets, transactions, getTotalBalance, getCategorySpending]);
}
