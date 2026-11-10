import { useMemo, useState } from 'react';
import { Lightbulb, ChevronRight, ChevronLeft } from 'lucide-react';
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
          const name = b.categories?.name || 'kategori ini';
          list.push({
            type: 'warning',
            title: pct >= 100 ? `Anggaran ${name} terlampaui` : `Anggaran ${name} hampir habis`,
            desc: `Sudah terpakai ${pct.toFixed(0)}% dari anggaran bulan ini.`
          });
        }
      }
    });

    // 2. Perbandingan dengan periode yang sama bulan lalu
    if (momStats) {
      if (momStats.lastMonthIncome > 0 && income > momStats.lastMonthIncome * 1.1) {
        list.push({
          type: 'success',
          title: 'Pemasukan naik',
          desc: 'Pemasukan bulan ini lebih dari 10% di atas periode yang sama bulan lalu. Pertimbangkan menyisihkan sebagian ke tabungan.'
        });
      }
      if (momStats.lastMonthExpense > 0 && expense > momStats.lastMonthExpense * 1.2) {
        list.push({
          type: 'danger',
          title: 'Pengeluaran naik tajam',
          desc: 'Pengeluaran bulan ini lebih dari 20% di atas periode yang sama bulan lalu. Cek lagi transaksi yang tidak rutin.'
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
          title: `${topCat.name} mendominasi pengeluaran`,
          desc: `${pct.toFixed(0)}% pengeluaran bulan ini ada di kategori ini.`
        });
      }
    }

    // Jika tidak ada temuan, katakan apa adanya (jangan memuji tanpa data)
    if (list.length === 0) {
      const hasData = income > 0 || expense > 0;
      list.push({
        type: 'info',
        title: hasData ? 'Belum ada yang perlu diperhatikan' : 'Belum ada data bulan ini',
        desc: hasData
          ? 'Tidak ada anggaran yang hampir habis dan tidak ada lonjakan pengeluaran dibanding bulan lalu.'
          : 'Catat transaksi bulan ini untuk melihat insight di sini.'
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
      default: return { color: 'var(--accent-primary)', bg: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' };
    }
  };

  const theme = getTheme(currentInsight?.type);

  return (
    <div className="ai-insights-widget card">
      <div className="ai-insights-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 700 }}>
            Insight Bulan Ini
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
