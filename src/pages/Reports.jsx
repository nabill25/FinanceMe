import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import {
  formatCurrency, formatCurrencyShort, formatCurrencyChart, getCurrentMonth, getMonthLabel,
  CATEGORY_ICONS
} from '../lib/utils';
import { exportReportToPDF } from '../lib/exportUtils';
import { analyzeHabits } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';
import './Reports.css';

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const d = payload[0];
    return (
      <div className="cashflow-tooltip">
        <p style={{ fontWeight: 600 }}>{d.name}</p>
        <p style={{ color: d.payload.color }}>{formatCurrency(d.value)}</p>
        <p className="text-xs text-muted">{d.payload.percent?.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const { user } = useAuthStore();
  const {
    transactions, fetchTransactions, getCategorySpending, getMonthSummary,
  } = useFinanceStore();

  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [habitInsight, setHabitInsight] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (user) fetchTransactions(user.id, { month: currentMonth });
  }, [user, currentMonth]);

  const { income, expense } = getMonthSummary(currentMonth);
  const categorySpending = getCategorySpending(currentMonth);

  const pieData = useMemo(() => {
    const total = categorySpending.reduce((s, c) => s + c.total, 0);
    return categorySpending.slice(0, 8).map(c => ({
      name: c.name,
      value: c.total,
      color: c.color,
      percent: total > 0 ? (c.total / total) * 100 : 0,
    }));
  }, [categorySpending]);

  // Build 6-month trend data
  const trendData = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const txs = transactions.filter(t => t.date?.startsWith(m));
      months.push({
        label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d),
        income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
    }
    return months;
  }, [transactions, currentMonth]);

  const navigateMonth = (dir) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + dir);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setHabitInsight('');
    try {
      const insight = await analyzeHabits(trendData, categorySpending, getMonthLabel(currentMonth));
      setHabitInsight(insight);
    } catch (err) {
      setHabitInsight('Gagal memuat analisis. Silakan coba lagi.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="reports-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Laporan</h1>
          <p className="text-secondary text-sm">Analisis keuangan Anda</p>
        </div>
        <div className="month-nav" style={{ padding: '8px 16px' }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, minWidth: '160px', textAlign: 'center' }}>
            {getMonthLabel(currentMonth)}
          </span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigateMonth(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => exportReportToPDF({ income, expense, net: income - expense }, categorySpending, getMonthLabel(currentMonth))}
        >
          Download PDF
        </button>
      </div>

      {/* Income vs Expense summary */}
      <div className="grid-2">
        <div className="card reports-summary-card" style={{ '--c': '#10b981' }}>
          <p className="text-sm" style={{ color: 'var(--accent-success)' }}>Total Pemasukan</p>
          <h3 className="reports-amount amount-income">{formatCurrency(income)}</h3>
        </div>
        <div className="card reports-summary-card" style={{ '--c': '#ef4444' }}>
          <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>Total Pengeluaran</p>
          <h3 className="reports-amount amount-expense">{formatCurrency(expense)}</h3>
        </div>
      </div>

      {/* Charts row */}
      <div className="reports-charts">
        {/* Donut chart - expense by category */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Pengeluaran per Kategori</h3>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <span className="empty-icon">📊</span>
              <p>Tidak ada data pengeluaran</p>
            </div>
          ) : (
            <>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%"
                      innerRadius={70} outerRadius={110}
                      paddingAngle={3} dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pie-legend">
                {pieData.map((d, i) => (
                  <div key={i} className="pie-legend-item">
                    <span className="legend-dot" style={{ background: d.color }} />
                    <span className="truncate" style={{ flex: 1, fontSize: '13px' }}>{d.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: d.color }}>
                      {formatCurrencyShort(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar chart - 6-month trend */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Tren 6 Bulan Terakhir</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatCurrencyChart} width={65} />
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '12px', color: 'var(--text-primary)' }}
                />
                <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category breakdown table */}
      {categorySpending.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>Rincian per Kategori</h3>
          <div className="category-breakdown">
            {categorySpending.map((c, i) => {
              const pct = expense > 0 ? (c.total / expense) * 100 : 0;
              return (
                <div key={i} className="breakdown-row">
                  <div className="flex items-center gap-sm" style={{ width: '180px', flexShrink: 0 }}>
                    <span style={{ fontSize: '18px' }}>{CATEGORY_ICONS[c.icon] || '📂'}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }} className="truncate">{c.name}</span>
                  </div>
                  <div className="progress-bar-container" style={{ flex: 1 }}>
                    <div className="progress-bar" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: c.color, width: '90px', textAlign: 'right' }}>
                      {formatCurrencyShort(c.total)}
                    </span>
                    <span className="text-xs text-muted" style={{ width: '40px', textAlign: 'right' }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Habit Analysis */}
      <div className="card" style={{ marginTop: '24px', background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '8px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: 0 }}>
            <Sparkles size={20} className="text-primary" />
            Analisis Kebiasaan Belanja AI
          </h3>
          {!habitInsight && !analyzing && (
            <button className="btn btn-primary btn-sm" onClick={handleAnalyze}>
              Analisis Bulan Ini
            </button>
          )}
        </div>
        
        {analyzing ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ marginBottom: '16px' }} />
            <p>Membaca pola kebiasaan belanja Anda...</p>
          </div>
        ) : habitInsight ? (
          <div className="insight-content" style={{ lineHeight: 1.6, fontSize: '15px' }}>
            <ReactMarkdown>{habitInsight}</ReactMarkdown>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button className="btn btn-outline btn-sm" onClick={handleAnalyze}>Analisis Ulang</button>
            </div>
          </div>
        ) : (
          <p className="text-secondary text-sm" style={{ margin: 0 }}>
            Klik tombol di atas untuk mendapatkan wawasan tentang pola pengeluaran Anda bulan ini dibandingkan 5 bulan terakhir.
          </p>
        )}
      </div>
    </div>
  );
}
