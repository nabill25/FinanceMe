import { useMemo, useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { getCurrentMonth } from '../../lib/utils';
import './AiInsightsWidget.css';

export default function AiInsightsWidget() {
  const { transactions, budgets, getCategorySpending, momStats, getMonthSummary } = useFinanceStore();
  
  const insights = useMemo(() => {
    const list = [];
    const currentMonth = getCurrentMonth();
    const categorySpending = getCategorySpending(currentMonth);
    const { income, expense } = getMonthSummary(currentMonth);

    // 1. Budget Alerts
    budgets.forEach(b => {
      const spent = categorySpending.find(c => c.category_id === b.category_id)?.total || 0;
      if (b.amount > 0) {
        const pct = (spent / b.amount) * 100;
        if (pct >= 90) {
          list.push({
            type: 'warning',
            title: 'Peringatan Anggaran ⚠️',
            desc: `Anggaran untuk kategori "${b.categories?.name}" sudah terpakai ${pct.toFixed(0)}%. Tahan pengeluaran Anda agar tidak defisit!`
          });
        }
      }
    });

    // 2. MoM Analysis
    if (momStats) {
      if (momStats.lastMonthIncome > 0 && income > momStats.lastMonthIncome * 1.1) {
        list.push({
          type: 'success',
          title: 'Pemasukan Meningkat 📈',
          desc: 'Pemasukan Anda naik >10% dibanding bulan lalu. Ini waktu yang tepat untuk menyisihkannya ke tabungan (Savings)!'
        });
      }
      if (momStats.lastMonthExpense > 0 && expense > momStats.lastMonthExpense * 1.2) {
        list.push({
          type: 'danger',
          title: 'Pengeluaran Melonjak 📉',
          desc: 'Pengeluaran Anda naik signifikan dibanding bulan lalu. Cek kembali riwayat transaksi Anda dan potong pengeluaran non-esensial.'
        });
      }
    }

    // 3. Top Category
    if (categorySpending.length > 0 && expense > 0) {
      const topCat = categorySpending[0];
      const pct = (topCat.total / expense) * 100;
      if (pct > 40) {
        list.push({
          type: 'info',
          title: 'Analisis Pengeluaran 🔍',
          desc: `Kategori "${topCat.name}" mendominasi ${pct.toFixed(0)}% dari total pengeluaran Anda bulan ini. Pertimbangkan untuk mencari alternatif yang lebih hemat.`
        });
      }
    }

    // Fallback if empty
    if (list.length === 0) {
      list.push({
        type: 'info',
        title: 'Keuangan Terkendali 🌟',
        desc: 'Pola pengeluaran Anda bulan ini terlihat sangat sehat dan stabil. Pertahankan kebiasaan baik ini!'
      });
    }

    return list;
  }, [transactions, budgets, momStats]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex(i => (i + 1) % insights.length);
  const prev = () => setCurrentIndex(i => (i - 1 + insights.length) % insights.length);

  const currentInsight = insights[currentIndex] || insights[0];

  const getTheme = (type) => {
    switch (type) {
      case 'warning': return { color: '#d97706', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'danger': return { color: '#dc2626', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'success': return { color: '#059669', bg: 'rgba(16, 185, 129, 0.1)' };
      default: return { color: '#4f46e5', bg: 'rgba(99, 102, 241, 0.1)' };
    }
  };

  const theme = getTheme(currentInsight?.type);

  return (
    <div className="ai-insights-widget card">
      <div className="ai-insights-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#8b5cf6" className="ai-sparkle-icon" />
          <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 700, background: 'linear-gradient(90deg, #6366f1, #d946ef)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            AI Insights
          </h3>
        </div>
        {insights.length > 1 && (
          <div className="ai-insights-nav">
            <button onClick={prev} className="btn-icon btn-ghost" title="Sebelumnya"><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currentIndex + 1} / {insights.length}</span>
            <button onClick={next} className="btn-icon btn-ghost" title="Selanjutnya"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      <div className="ai-insight-content" style={{ background: theme.bg, borderColor: theme.color }}>
        <div style={{ fontWeight: 600, color: theme.color, fontSize: '13px', marginBottom: '6px' }}>
          {currentInsight?.title}
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {currentInsight?.desc}
        </p>
      </div>
    </div>
  );
}
