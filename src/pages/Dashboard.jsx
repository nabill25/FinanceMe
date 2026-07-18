import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import {
  TrendingUp, TrendingDown, Wallet, ArrowRight,
  Plus, Target, Eye, EyeOff
} from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import {
  formatCurrency, formatCurrencyShort, formatDate,
  getCurrentMonth, getMonthLabel, CATEGORY_ICONS, ACCOUNT_TYPES, ACCOUNT_PROVIDERS
} from '../lib/utils';
import CashflowChart from '../components/dashboard/CashflowChart';
import MonthlySpendingDonut from '../components/dashboard/MonthlySpendingDonut';
import BudgetSimulatorWidget from '../components/dashboard/BudgetSimulatorWidget';
import GoalProgressCard from '../components/dashboard/GoalProgressCard';
import ProviderLogo from '../components/ProviderLogo';
import './Dashboard.css';

const StatCard = ({ label, value, icon: Icon, color, trend, trendLabel, rawValue, showBalance }) => (
  <div className="stat-card card hover-lift">
    <div className="stat-card-header">
      <span className="stat-card-label">{label}</span>
      <div className="stat-card-icon" style={{ background: color }}>
        <Icon size={18} color="white" />
      </div>
    </div>
    <div className="stat-card-value" style={{ transition: 'all 0.3s' }}>
      {showBalance ? (
        <CountUp
          start={0}
          end={rawValue}
          duration={1.5}
          separator="."
          prefix="Rp "
          formattingFn={formatCurrencyShort}
        />
      ) : (
        value
      )}
    </div>
    {trend !== undefined && (
      <div className={`stat-card-trend ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>
        {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        <span>{trendLabel}</span>
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const { user } = useAuthStore();
  const {
    accounts, transactions, budgets, categories, goals, showBalance, setShowBalance,
    fetchAccounts, fetchTransactions, fetchBudgets, fetchCategories, fetchGoals,
    getTotalBalance, getMonthSummary, getCategorySpending,
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

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Anda';

  // Obscure text if hidden
  const obscure = (val) => showBalance ? val : 'Rp •••••••';
  const obscureShort = (val) => showBalance ? val : '••••';

  return (
    <div className="dashboard animate-fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">
            Halo, {firstName}! 👋
          </h1>
          <p className="text-secondary text-sm">{monthLabel} — Ringkasan keuangan Anda</p>
        </div>
        <Link to="/transactions" className="btn btn-primary btn-sm hover-lift">
          <Plus size={15} />
          Catat Transaksi
        </Link>
      </div>

      {/* Total Balance Hero */}
      <div className="balance-hero card hover-lift-slight">
        <div className="balance-hero-bg" />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="balance-hero-label">Total Saldo Semua Akun</p>
          <button className="btn-icon btn-ghost" style={{ color: 'rgba(255,255,255,0.7)', margin: '-8px' }} onClick={() => setShowBalance(!showBalance)}>
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <h2 className="balance-hero-amount" style={{ transition: 'all 0.3s ease' }}>
          {showBalance ? (
            <CountUp
              start={0}
              end={totalBalance}
              duration={1.5}
              formattingFn={formatCurrency}
            />
          ) : (
            obscure(formatCurrency(totalBalance))
          )}
        </h2>
        <div className="balance-hero-accounts">
          {accounts.slice(0, 4).map((acc) => {
            const provider = ACCOUNT_PROVIDERS[acc.type]?.find(p => p.id === acc.icon);
            return (
              <div key={acc.id} className="balance-hero-account">
                <ProviderLogo account={acc} size={28} />
                <div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{acc.name}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', transition: 'all 0.3s' }}>
                    {showBalance ? (
                      <CountUp
                        start={0}
                        end={acc.balance}
                        duration={1.5}
                        formattingFn={formatCurrencyShort}
                      />
                    ) : (
                      obscureShort(formatCurrencyShort(acc.balance))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {accounts.length === 0 && (
            <Link to="/accounts" className="balance-hero-add-account">
              <Plus size={14} />
              Tambah akun
            </Link>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-lg)' }}>
        <StatCard
          label={`Pemasukan ${monthLabel.split(' ')[0]}`}
          value={obscureShort(formatCurrencyShort(income))}
          rawValue={income}
          showBalance={showBalance}
          icon={TrendingUp}
          color="linear-gradient(135deg,#10b981,#06b6d4)"
        />
        <StatCard
          label={`Pengeluaran ${monthLabel.split(' ')[0]}`}
          value={obscureShort(formatCurrencyShort(expense))}
          rawValue={expense}
          showBalance={showBalance}
          icon={TrendingDown}
          color="linear-gradient(135deg,#ef4444,#f97316)"
        />
        <StatCard
          label="Net Bulan Ini"
          value={obscureShort(formatCurrencyShort(Math.abs(net)))}
          rawValue={Math.abs(net)}
          showBalance={showBalance}
          icon={Wallet}
          color={net >= 0 ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#f59e0b,#f97316)'}
          trendLabel={net >= 0 ? 'Surplus' : 'Defisit'}
          trend={net}
        />
      </div>

      {/* Goal Progress & Budget Simulator Row */}
      <div className="dashboard-row" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ flex: 1 }}>
          <GoalProgressCard />
        </div>
        <div style={{ flex: 1 }}>
          <BudgetSimulatorWidget />
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
                      ⚠️ Over Budget! ({formatCurrencyShort(b.spent - b.amount)})
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
                  {tx.type === 'income' ? '+' : '-'}{formatCurrencyShort(tx.amount)}
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
