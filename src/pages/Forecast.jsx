import { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { forecastFinancials } from '../lib/gemini';
import { 
  TrendingUp, TrendingDown, AlertTriangle, 
  Sparkles, CalendarClock, Target 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './Forecast.css';

// Helper to format currency
const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
};

export default function Forecast() {
  const { transactions } = useFinanceStore();
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Calculate Data for Current Month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Filter transactions for this month
  const thisMonthTx = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const income = thisMonthTx
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const currentExpense = thisMonthTx
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Math Projection
  const burnRate = currentExpense / (currentDay || 1);
  const predictedExpense = burnRate * daysInMonth;
  const safeRemaining = income - predictedExpense;

  useEffect(() => {
    const fetchInsight = async () => {
      setLoading(true);
      try {
        const data = {
          burnRate: Math.round(burnRate),
          currentExpense,
          income,
          predictedExpense: Math.round(predictedExpense)
        };
        const result = await forecastFinancials(data);
        setInsight(result);
      } catch (err) {
        setInsight('Gagal memuat proyeksi AI.');
      } finally {
        setLoading(false);
      }
    };

    fetchInsight();
  }, [burnRate, currentExpense, income, predictedExpense]);

  return (
    <div className="forecast-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Proyeksi Keuangan</h1>
          <p className="text-secondary text-sm">Prediksi pengeluaran hingga akhir bulan</p>
        </div>
      </div>

      <div className="forecast-grid">
        <div className="card forecast-card">
          <div className="forecast-card-header">
            <div className="forecast-card-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              <TrendingDown size={20} />
            </div>
            <span className="text-sm text-secondary">Rata-rata Pengeluaran Harian</span>
          </div>
          <div className="forecast-amount">{formatCurrency(burnRate)}</div>
          <p className="text-xs text-muted">Berdasarkan {currentDay} hari yang telah berlalu</p>
        </div>

        <div className="card forecast-card">
          <div className="forecast-card-header">
            <div className="forecast-card-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <Target size={20} />
            </div>
            <span className="text-sm text-secondary">Prediksi Akhir Bulan</span>
          </div>
          <div className="forecast-amount">{formatCurrency(predictedExpense)}</div>
          <p className="text-xs text-muted">Jika kecepatan pengeluaran dipertahankan</p>
        </div>

        <div className="card forecast-card">
          <div className="forecast-card-header">
            <div className="forecast-card-icon" style={{ 
              background: safeRemaining >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
              color: safeRemaining >= 0 ? '#10b981' : '#ef4444' 
            }}>
              <CalendarClock size={20} />
            </div>
            <span className="text-sm text-secondary">Sisa Aman / Defisit</span>
          </div>
          <div className="forecast-amount" style={{ color: safeRemaining >= 0 ? '#10b981' : '#ef4444' }}>
            {formatCurrency(safeRemaining)}
          </div>
          <p className="text-xs text-muted">Pemasukan dikurangi prediksi pengeluaran</p>
        </div>
      </div>

      <div className="forecast-insight">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
          <Sparkles size={20} className="text-primary" />
          AI Insight & Peringatan Dini
        </h3>
        
        {loading ? (
          <div className="insight-loading">
            <span className="spinner" />
            <span>Menganalisis pola pengeluaran Anda...</span>
          </div>
        ) : (
          <div className="insight-content">
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
