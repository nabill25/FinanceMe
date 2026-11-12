import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Send, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import {
  formatCurrency, formatDateShort, getCurrentMonth, getLastMonth, getMonthLabel, CATEGORY_ICONS,
} from '../lib/utils';
import { exportReportToPDF } from '../lib/exportUtils';
import {
  ymd, daysBetween, toIdr, detectPayday, spendTotals, monthlyFlow, buildBalanceSeries, balanceChange, countWord,
} from '../lib/overview';
import CardStack from '../components/dashboard/CardStack';
import BalanceCard from '../components/dashboard/BalanceCard';
import MoneyFlowCard from '../components/dashboard/MoneyFlowCard';
import MonthlySpendingDonut from '../components/dashboard/MonthlySpendingDonut';
import BudgetSimulatorWidget from '../components/dashboard/BudgetSimulatorWidget';
import UpcomingBillsWidget from '../components/dashboard/UpcomingBillsWidget';
import GoalProgressCard from '../components/dashboard/GoalProgressCard';
import FinancialHealthWidget from '../components/dashboard/FinancialHealthWidget';
import AiInsightsWidget from '../components/dashboard/AiInsightsWidget';
import AchievementsWidget from '../components/dashboard/AchievementsWidget';
import './Dashboard.css';

const greetingFor = (hour) => {
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 18) return 'Selamat sore';
  return 'Selamat malam';
};

/** Kalimat di bawah sapaan: kapan pemasukan berikutnya & tagihan sebelum itu. */
function headerLine(payday, recurringBills, today) {
  const todayStr = ymd(today);
  const bills = recurringBills.filter((b) => b.is_active && b.next_due && b.type !== 'income' && b.next_due >= todayStr);
  if (payday) {
    const days = daysBetween(today, payday.date);
    const name = payday.name.charAt(0).toUpperCase() + payday.name.slice(1);
    if (days <= 0) return `${name} dijadwalkan hari ini.`;
    const before = bills.filter((b) => b.next_due < ymd(payday.date)).length;
    const when = days === 1 ? `${name} besok.` : `${name} ${days} hari lagi.`;
    return `${when} ${before === 0 ? 'Tidak ada tagihan sebelum itu.' : `${countWord(before, true)} tagihan jatuh tempo sebelum itu.`}`;
  }
  const in7 = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
  const soon = bills.filter((b) => b.next_due <= in7);
  if (soon.length === 0) return 'Tidak ada tagihan yang jatuh tempo dalam 7 hari ke depan.';
  const total = soon.reduce((s, b) => s + Number(b.amount || 0), 0);
  return `${countWord(soon.length, true)} tagihan jatuh tempo dalam 7 hari ke depan, total ${formatCurrency(total)}.`;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { setQuickAddOpen, setTransferOpen } = useUiStore();
  const {
    accounts, transactions, budgets, recurringBills,
    fetchAccounts, fetchTransactions, fetchBudgets, fetchCategories, fetchGoals, fetchMoMStats, fetchTransactionHistory,
    getTotalBalance, getCategorySpending,
  } = useFinanceStore();

  const currentMonth = getCurrentMonth();
  const monthStart = `${currentMonth}-01`;
  const monthLabel = getMonthLabel(currentMonth);
  const today = useMemo(() => new Date(), []);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [monthReady, setMonthReady] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    fetchAccounts(user.id);
    Promise.resolve(fetchTransactions(user.id, { month: currentMonth }))
      .catch(() => {})
      .finally(() => { if (!cancelled) setMonthReady(true); });
    fetchBudgets(user.id, currentMonth);
    fetchCategories(user.id);
    fetchGoals(user.id);
    fetchMoMStats(user.id, getLastMonth(currentMonth));
    // 12 bulan riwayat untuk grafik saldo, uang masuk & keluar, dan perkiraan gajian
    fetchTransactionHistory(user.id, ymd(new Date(today.getFullYear(), today.getMonth() - 11, 1)))
      .then((data) => { if (!cancelled) setHistory(data); })
      .catch(() => { /* grafik tetap memakai data bulan ini */ })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  // Bulan ini diambil dari store (langsung berubah saat transaksi ditambah/diedit/dihapus);
  // bulan-bulan sebelumnya dari riwayat.
  const monthTx = useMemo(() => (monthReady
    ? transactions.filter((t) => t.date?.startsWith(currentMonth))
    : history.filter((t) => t.date >= monthStart)), [monthReady, transactions, history, currentMonth, monthStart]);
  const allTx = useMemo(() => [...history.filter((t) => t.date < monthStart), ...monthTx], [history, monthTx, monthStart]);

  const totalBalance = getTotalBalance();
  const payday = useMemo(() => detectPayday(allTx, recurringBills, today), [allTx, recurringBills, today]);
  const spend = useMemo(() => spendTotals(allTx, today), [allTx, today]);
  const months = useMemo(() => monthlyFlow(allTx, today, 12), [allTx, today]);
  const series = useMemo(
    () => buildBalanceSeries({ history: allTx, totalBalance, recurringBills, payday, today }),
    [allTx, totalBalance, recurringBills, payday, today],
  );
  const change = useMemo(
    () => (historyLoading ? null : balanceChange(allTx, totalBalance, today)),
    [historyLoading, allTx, totalBalance, today],
  );

  const recentTx = useMemo(() => [...monthTx]
    .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 6), [monthTx]);

  const categorySpending = getCategorySpending(currentMonth);
  const budgetProgress = useMemo(() => budgets.map((b) => {
    const spent = categorySpending.find((c) => c.category_id === b.category_id)?.total || 0;
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    return { ...b, spent, pct, isOver: spent > b.amount };
  }).sort((a, b) => b.pct - a.pct), [budgets, categorySpending]);
  const overBudget = budgetProgress.filter((b) => b.isOver).length;

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Anda';
  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
  const canTransfer = accounts.length >= 2;

  const handleExport = () => {
    const real = monthTx.filter((t) => !t.transfer_type);
    const income = real.filter((t) => t.type === 'income').reduce((s, t) => s + toIdr(t), 0);
    const expense = real.filter((t) => t.type === 'expense').reduce((s, t) => s + toIdr(t), 0);
    const byCategory = new Map();
    real.filter((t) => t.type === 'expense').forEach((t) => {
      const name = t.categories?.name || 'Lainnya';
      byCategory.set(name, (byCategory.get(name) || 0) + toIdr(t));
    });
    const cats = [...byCategory.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    exportReportToPDF({ income, expense, net: income - expense }, cats, monthLabel);
    toast.success(`Rekap ${monthLabel} diunduh`);
  };

  return (
    <div className="dashboard animate-fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <p className="page-eyebrow">{dateLabel}</p>
          <h1 className="dashboard-greeting">{greetingFor(today.getHours())}, {firstName}</h1>
          <p className="dashboard-subline">{headerLine(payday, recurringBills, today)}</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-outline" onClick={handleExport} disabled={monthTx.length === 0}>
            <Download size={16} /> Rekap
          </button>
          {canTransfer ? (
            <button className="btn btn-primary" onClick={() => setTransferOpen(true)}>
              <Send size={16} /> Transfer
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setQuickAddOpen(true)}>
              <Plus size={16} /> Catat transaksi
            </button>
          )}
        </div>
      </div>

      {/* Kartu · Total saldo · Uang masuk & keluar */}
      <div className="overview-grid">
        <CardStack accounts={accounts} transactions={monthTx} />
        <BalanceCard
          totalBalance={totalBalance}
          accounts={accounts}
          spend={spend}
          change={change}
          series={series}
          loading={historyLoading}
        />
        <MoneyFlowCard months={months} loading={historyLoading} />
      </div>

      {/* Widget lain */}
      <div className="overview-more">
        <section className="card widget">
          <div className="widget-head">
            <div>
              <h3 className="card-heading">Transaksi terbaru</h3>
              <p className="card-sub">{monthLabel}</p>
            </div>
            <Link to="/transactions" className="widget-link">Semua <ChevronRight size={14} /></Link>
          </div>
          {recentTx.length === 0 ? (
            <div className="widget-empty">
              <p>Belum ada transaksi bulan ini.</p>
              <button type="button" className="pill-btn" onClick={() => setQuickAddOpen(true)}>
                <Plus size={14} /> Catat transaksi
              </button>
            </div>
          ) : (
            <div className="recent-tx-list">
              {recentTx.map((tx) => {
                const sign = tx.type === 'income' ? '+' : '−';
                const tone = tx.transfer_type ? 'is-transfer' : tx.type === 'income' ? 'is-income' : '';
                return (
                  <div key={tx.id} className="recent-tx-item">
                    <div className="recent-tx-icon" aria-hidden="true">
                      {tx.transfer_type ? '⇄' : CATEGORY_ICONS[tx.categories?.icon] || (tx.type === 'income' ? '💰' : '💸')}
                    </div>
                    <div className="recent-tx-info">
                      <span className="recent-tx-desc">{tx.description || tx.categories?.name || 'Transaksi'}</span>
                      <span className="recent-tx-meta">{tx.accounts?.name} · {formatDateShort(tx.date)}</span>
                    </div>
                    <span className={`recent-tx-amount amount-text ${tone}`}>
                      {sign}{formatCurrency(tx.amount, tx.accounts?.currency || 'IDR')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card widget">
          <div className="widget-head">
            <div>
              <h3 className="card-heading">Anggaran bulan ini</h3>
              <p className="card-sub">
                {budgets.length === 0 ? 'Belum ada anggaran' : overBudget > 0 ? `${countWord(overBudget, true)} kategori melewati batas` : 'Semua masih di bawah batas'}
              </p>
            </div>
            <Link to="/budget" className="widget-link">Kelola <ChevronRight size={14} /></Link>
          </div>
          {budgetProgress.length === 0 ? (
            <div className="widget-empty">
              <p>Atur batas belanja per kategori agar tahu kapan harus mengerem.</p>
              <Link to="/budget" className="pill-btn"><Plus size={14} /> Buat anggaran</Link>
            </div>
          ) : (
            <div className="budget-rows">
              {budgetProgress.slice(0, 5).map((b, i) => (
                <div className="budget-row" key={b.id} style={{ '--i': i }}>
                  <div className="budget-row-top">
                    <span className="budget-row-name">{b.categories?.name || 'Kategori'}</span>
                    <span className={`budget-row-amount amount-text ${b.isOver ? 'is-over' : ''}`}>
                      {formatCurrency(b.spent)} <span>/ {formatCurrency(b.amount)}</span>
                    </span>
                  </div>
                  <span className="budget-track">
                    <span
                      className={`budget-fill ${b.isOver ? 'over' : b.pct > 85 ? 'warn' : ''}`}
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <UpcomingBillsWidget />
        <AiInsightsWidget />
        <FinancialHealthWidget />
        <GoalProgressCard />
        <MonthlySpendingDonut />
        <BudgetSimulatorWidget />
        <AchievementsWidget />
      </div>
    </div>
  );
}
