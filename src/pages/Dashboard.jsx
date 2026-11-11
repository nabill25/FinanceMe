import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import {
  TrendingUp, TrendingDown, Wallet, ArrowRight, Plus, BarChart3
} from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import {
  formatCurrency, formatCurrencyShort, formatDate,
  getCurrentMonth, getLastMonth, getMonthLabel, CATEGORY_ICONS
} from '../lib/utils';
import CashflowChart from '../components/dashboard/CashflowChart';
import MonthlySpendingDonut from '../components/dashboard/MonthlySpendingDonut';
import BudgetSimulatorWidget from '../components/dashboard/BudgetSimulatorWidget';
import UpcomingBillsWidget from '../components/dashboard/UpcomingBillsWidget';
import GoalProgressCard from '../components/dashboard/GoalProgressCard';
import FinancialHealthWidget from '../components/dashboard/FinancialHealthWidget';
import AiInsightsWidget from '../components/dashboard/AiInsightsWidget';
import AchievementsWidget from '../components/dashboard/AchievementsWidget';
import ProviderLogo from '../components/ProviderLogo';
import './Dashboard.css';

const StatCard = ({ label, icon: Icon, iconColor, iconBg, trend, trendLabel, rawValue, trendColor }) => (
  <div className="stat-card card">
    <div className="stat-card-header">
      <span className="stat-card-label">{label}</span>
      <div className="stat-card-icon" style={{ background: iconBg, color: iconColor }}>
        <Icon size={18} />
      </div>
    </div>
    <div className="stat-card-value amount-text" style={{ transition: 'all 0.3s' }}>
      <CountUp
        start={0}
        end={rawValue}
        duration={1.5}
        separator="."
        prefix="Rp "
        formattingFn={formatCurrencyShort}
      />
    </div>
    {trend !== undefined && (
      <div className={`stat-card-trend ${trendColor === 'success' ? 'trend-up' : trendColor === 'danger' ? 'trend-down' : trend >= 0 ? 'trend-up' : 'trend-down'}`}>
        {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        <span>{trendLabel}</span>
      </div>
    )}
  </div>
);

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const greetingFor = (hour) => {
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 18) return 'Selamat sore';
  return 'Selamat malam';
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const { setQuickAddOpen } = useUiStore();
  const {
    accounts, transactions, budgets, recurringBills,
    fetchAccounts, fetchTransactions, fetchBudgets, fetchCategories, fetchGoals,
    getTotalBalance, getMonthSummary, getCategorySpending,
    momStats, fetchMoMStats
  } = useFinanceStore();

  const currentMonth = getCurrentMonth();
  const monthLabel = getMonthLabel(currentMonth);

  useEffect(() => {
    if (!user) return;
    fetchAccounts(user.id);
    fetchTransactions(user.id, { month: currentMonth });
    fetchBudgets(user.id, currentMonth);
    fetchCategories(user.id);
    fetchGoals(user.id);
    fetchMoMStats(user.id, getLastMonth(currentMonth));
  }, [user]);

  const totalBalance = getTotalBalance();
  const { income, expense, net } = getMonthSummary(currentMonth);
  const categorySpending = getCategorySpending(currentMonth);
  const recentTx = transactions.slice(0, 8);

  const budgetProgress = useMemo(() => {
    return budgets.map((b) => {
      const spent = categorySpending.find((c) => c.category_id === b.category_id)?.total || 0;
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const isOver = spent > b.amount;
      return { ...b, spent, pct, isOver };
    }).slice(0, 4);
  }, [budgets, categorySpending]);

  let incomeTrend, incomeTrendLabel, incomeTrendColor;
  let expenseTrend, expenseTrendLabel, expenseTrendColor;

  if (momStats) {
    const incDiff = income - momStats.lastMonthIncome;
    const incPct = momStats.lastMonthIncome > 0 ? (incDiff / momStats.lastMonthIncome) * 100 : (income > 0 ? 100 : 0);
    incomeTrend = incPct;
    incomeTrendLabel = `${Math.abs(incPct).toFixed(0)}% dr bln lalu`;
    incomeTrendColor = incPct >= 0 ? 'success' : 'danger';

    const expDiff = expense - momStats.lastMonthExpense;
    const expPct = momStats.lastMonthExpense > 0 ? (expDiff / momStats.lastMonthExpense) * 100 : (expense > 0 ? 100 : 0);
    expenseTrend = expPct;
    expenseTrendLabel = `${Math.abs(expPct).toFixed(0)}% dr bln lalu`;
    expenseTrendColor = expPct <= 0 ? 'success' : 'danger';
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Anda';

  // Ringkasan untuk header & kartu saldo
  const today = new Date();
  const todayStr = ymd(today);
  const weekStartStr = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)));
  const in7Str = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
  const realExpenses = transactions.filter((t) => t.type === 'expense' && !t.transfer_type);
  const spentToday = realExpenses.filter((t) => t.date === todayStr).reduce((s, t) => s + t.amount, 0);
  const spentWeek = realExpenses.filter((t) => t.date >= weekStartStr && t.date <= todayStr).reduce((s, t) => s + t.amount, 0);
  const upcomingBills = recurringBills.filter((b) => b.is_active && b.next_due && b.next_due <= in7Str);
  const upcomingTotal = upcomingBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);

  return (
    <div className="dashboard animate-fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <p className="page-eyebrow">{dateLabel}</p>
          <h1 className="dashboard-greeting">
            {greetingFor(today.getHours())}, {firstName}
          </h1>
          <p className="text-secondary text-sm">
            {upcomingBills.length > 0
              ? `${upcomingBills.length} tagihan jatuh tempo dalam 7 hari ke depan, total ${formatCurrency(upcomingTotal)}.`
              : 'Tidak ada tagihan yang jatuh tempo dalam 7 hari ke depan.'}
          </p>
        </div>
        <div className="dashboard-actions">
          <Link to="/reports" className="btn btn-outline">
            <BarChart3 size={16} /> Laporan
          </Link>
          <button className="btn btn-primary" onClick={() => setQuickAddOpen(true)}>
            <Plus size={16} /> Catat transaksi
          </button>
        </div>
      </div>

      {/* Total saldo */}
      <section className="balance-hero card">
        <div className="balance-hero-head">
          <div>
            <p className="card-heading">Total saldo</p>
            <p className="card-sub">{accounts.length} akun · {monthLabel}</p>
          </div>
          <Link to="/accounts" className="btn btn-ghost btn-sm">
            Kelola akun <ArrowRight size={14} />
          </Link>
        </div>

        <div className="balance-hero-main">
          <h2 className="balance-hero-amount amount-text">
            <CountUp start={0} end={totalBalance} duration={1.5} formattingFn={formatCurrency} />
          </h2>
          <span className={`balance-delta ${net >= 0 ? 'up' : 'down'}`}>
            {net >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            Net bulan ini {net >= 0 ? '+' : '−'}{formatCurrencyShort(Math.abs(net))}
          </span>
        </div>

        <div className="balance-pills">
          {[
            ['Keluar hari ini', spentToday],
            ['Minggu ini', spentWeek],
            ['Bulan ini', expense],
            ['Masuk bulan ini', income],
          ].map(([label, value]) => (
            <div className="balance-pill" key={label}>
              <span>{label}</span>
              <strong className="amount-text">{formatCurrencyShort(value)}</strong>
            </div>
          ))}
        </div>

        <div className="balance-hero-accounts">
          {accounts.slice(0, 4).map((acc) => (
            <Link to="/accounts" state={{ openAccountId: acc.id }} key={acc.id} className="balance-hero-account">
              <ProviderLogo account={acc} size={24} />
              <span className="balance-account-text">
                <span className="balance-account-name">{acc.name}</span>
                <span className="balance-account-amount amount-text">{formatCurrencyShort(acc.balance, acc.currency)}</span>
              </span>
            </Link>
          ))}
          {accounts.length === 0 && (
            <Link to="/accounts" className="balance-hero-add-account">
              <Plus size={14} />
              Tambah akun
            </Link>
          )}
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid-3 stagger-children" style={{ marginBottom: 'var(--space-lg)' }}>
        <StatCard
          label={`Pemasukan ${monthLabel.split(' ')[0]}`}
          rawValue={income}
          icon={TrendingUp}
          iconColor="var(--accent-success)"
          iconBg="color-mix(in srgb, var(--accent-success) 14%, transparent)"
          trend={incomeTrend}
          trendLabel={incomeTrendLabel}
          trendColor={incomeTrendColor}
        />
        <StatCard
          label={`Pengeluaran ${monthLabel.split(' ')[0]}`}
          rawValue={expense}
          icon={TrendingDown}
          iconColor="var(--accent-danger)"
          iconBg="color-mix(in srgb, var(--accent-danger) 14%, transparent)"
          trend={expenseTrend}
          trendLabel={expenseTrendLabel}
          trendColor={expenseTrendColor}
        />
        <StatCard
          label="Net Bulan Ini"
          rawValue={Math.abs(net)}
          icon={Wallet}
          iconColor={net >= 0 ? 'var(--accent-primary)' : 'var(--accent-warning)'}
          iconBg={net >= 0 ? 'var(--accent-soft)' : 'color-mix(in srgb, var(--accent-warning) 16%, transparent)'}
          trendLabel={net >= 0 ? 'Surplus' : 'Defisit'}
          trend={net}
        />
      </div>

      {expenseTrend < 0 && (
        <div style={{ marginBottom: 'var(--space-lg)', padding: '12px 16px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'color-mix(in srgb, var(--accent-success) 14%, transparent)', color: 'var(--accent-success)', padding: '8px', borderRadius: '50%' }}>
            <TrendingDown size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>Pengeluaran lebih hemat dari bulan lalu</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Turun {Math.abs(expenseTrend).toFixed(0)}% dibandingkan periode yang sama bulan lalu.</div>
          </div>
        </div>
      )}

      {/* Goal Progress, Financial Health & Budget Simulator Row */}
      <div className="dashboard-row" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <AiInsightsWidget />
          <FinancialHealthWidget />
          <GoalProgressCard />
        </div>
        <div className="dashboard-budget stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <AchievementsWidget />
          <BudgetSimulatorWidget />
          <UpcomingBillsWidget />
        </div>
      </div>

      {/* Chart & Donut Row */}
      <div className="dashboard-row" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="dashboard-chart" style={{ flex: 2 }}>
          <CashflowChart days={30} />
        </div>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <MonthlySpendingDonut />
        </div>
      </div>

      {/* Budget & Transactions Row */}
      <div className="dashboard-row">
        <div className="card dashboard-budget">
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px' }}>Anggaran Bulan Ini</h3>
            <Link to="/budget" className="btn btn-ghost btn-sm">
              <ArrowRight size={14} />
            </Link>
          </div>

          {budgetProgress.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <span className="empty-icon">🎯</span>
              <p style={{ fontSize: '13px' }}>Belum ada anggaran</p>
              <Link to="/budget" className="btn btn-primary btn-sm">Buat Anggaran</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {budgetProgress.map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                    <div className="flex items-center gap-sm">
                      <span>{CATEGORY_ICONS[b.categories?.icon] || '📂'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>
                        {b.categories?.name}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', color: b.isOver ? 'var(--accent-danger)' : b.pct > 90 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
                        {formatCurrencyShort(b.spent)} / {formatCurrencyShort(b.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(b.pct, 100)}%`,
                        background: b.isOver
                          ? 'var(--gradient-danger)'
                          : b.pct > 90
                          ? 'var(--gradient-danger)'
                          : b.pct > 70
                          ? 'var(--gradient-warning)'
                          : 'var(--gradient-success)',
                      }}
                    />
                  </div>
                  {b.isOver && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--accent-danger)', fontWeight: 600 }}>
                      Melebihi anggaran {formatCurrencyShort(b.spent - b.amount)}
                    </p>
                  )}
                </div>
              ))}
              {budgets.length > 4 && (
                <Link to="/budget" style={{ fontSize: '13px', color: 'var(--accent-primary)', textAlign: 'center' }}>
                  Lihat semua ({budgets.length})
                </Link>
              )}
            </div>
          )}
        </div>
      {/* Recent transactions */}
      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px' }}>Transaksi Terbaru</h3>
          <Link to="/transactions" className="btn btn-ghost btn-sm">
            Lihat semua <ArrowRight size={14} />
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>Belum ada transaksi bulan ini</p>
            <Link to="/transactions" className="btn btn-primary btn-sm">
              <Plus size={14} /> Catat Transaksi
            </Link>
          </div>
        ) : (
          <div className="recent-tx-list">
            {recentTx.map((tx) => (
              <div key={tx.id} className="recent-tx-item">
                <div className="recent-tx-icon" style={{ background: (tx.categories?.color || '#6b7280') + '22' }}>
                  {CATEGORY_ICONS[tx.categories?.icon] || (tx.type === 'income' ? '💰' : '💸')}
                </div>
                <div className="recent-tx-info">
                  <span className="recent-tx-desc">{tx.description || tx.categories?.name || 'Transaksi'}</span>
                  <span className="recent-tx-meta">
                    {tx.accounts?.name} · {formatDate(tx.date)}
                  </span>
                </div>
                <span className={`recent-tx-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrencyShort(tx.amount, tx.accounts?.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
