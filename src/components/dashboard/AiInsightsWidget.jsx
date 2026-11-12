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

  const safeIndex = currentIndex < insights.length ? currentIndex : 0;
  const currentInsight = insights[safeIndex];

  return (
    <section className="ai-insights-widget card widget">
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Insight bulan ini</h3>
          <p className="card-sub">Dari anggaran & perbandingan dengan bulan lalu</p>
        </div>
        {insights.length > 1 && (
          <div className="ai-insights-nav">
            <button type="button" onClick={prev} className="round-icon-btn" aria-label="Insight sebelumnya"><ChevronLeft size={15} /></button>
            <span>{safeIndex + 1}/{insights.length}</span>
            <button type="button" onClick={next} className="round-icon-btn" aria-label="Insight berikutnya"><ChevronRight size={15} /></button>
          </div>
        )}
      </div>

      <div className={`ai-insight-content tone-${currentInsight?.type || 'info'}`} key={safeIndex}>
        <p className="ai-insight-title">
          <Lightbulb size={15} aria-hidden="true" /> {currentInsight?.title}
        </p>
        <p className="ai-insight-desc">{currentInsight?.desc}</p>
      </div>
    </section>
  );
}
