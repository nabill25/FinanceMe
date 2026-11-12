import { useMemo } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { getCurrentMonth } from '../../lib/utils';
import { Activity, HeartPulse, AlertTriangle } from 'lucide-react';
import AnimatedNumber from '../AnimatedNumber';
import './FinancialHealthWidget.css';

// Skor ditampilkan sebagai bilangan bulat (stabil: didefinisikan di luar komponen)
const scoreText = (v) => String(Math.round(v));

export default function FinancialHealthWidget() {
  const { getMonthSummary, spendingLimit, spendingGuardState } = useFinanceStore();
  const currentMonth = getCurrentMonth();
  const { income, expense } = getMonthSummary(currentMonth);

  const healthData = useMemo(() => {
    // Tanpa data, jangan beri skor 100 "Sangat Sehat": belum ada yang bisa dinilai
    if (income === 0 && expense === 0) {
      return {
        score: null,
        color: 'var(--text-muted)',
        status: 'Belum ada data',
        message: 'Catat pemasukan dan pengeluaran bulan ini untuk melihat skor.',
        icon: <Activity size={18} color="var(--text-muted)" />,
      };
    }

    let cashflowScore = 0;
    let savingsScore = 0;
    let limitScore = 0;

    // 1. Cashflow Score (Max 40)
    if (income === 0 && expense === 0) {
      cashflowScore = 40; // Default if no data
    } else if (income > 0) {
      if (expense <= income) {
        cashflowScore = 40;
      } else if (expense <= income * 1.2) {
        cashflowScore = 20;
      } else {
        cashflowScore = 0;
      }
    } else {
      cashflowScore = 0; // Expense without income
    }

    // 2. Savings Score (Max 30) - target 20% of income
    if (income > 0) {
      const savings = income - expense;
      const savingsRatio = savings / income;
      if (savingsRatio >= 0.2) {
        savingsScore = 30;
      } else if (savingsRatio > 0) {
        savingsScore = Math.round((savingsRatio / 0.2) * 30);
      }
    } else if (income === 0 && expense === 0) {
      savingsScore = 30;
    }

    // 3. Limit Score (Max 30)
    if (spendingLimit?.is_active && spendingGuardState) {
      const pct = spendingGuardState.pct;
      if (pct < 80) limitScore = 30;
      else if (pct < 100) limitScore = 15;
      else limitScore = 0;
    } else {
      // If no limit active, assume good behavior if expenses are less than income
      if (expense < income || (income === 0 && expense === 0)) {
        limitScore = 30;
      } else {
        limitScore = 15;
      }
    }

    const totalScore = cashflowScore + savingsScore + limitScore;

    // Pesan berdasarkan angka sebenarnya, bukan pujian/peringatan generik
    let message;
    if (income === 0) {
      message = 'Ada pengeluaran, tetapi belum ada pemasukan bulan ini.';
    } else if (expense > income) {
      message = `Pengeluaran ${Math.round(((expense - income) / income) * 100)}% di atas pemasukan bulan ini.`;
    } else {
      message = `Sisa ${Math.round(((income - expense) / income) * 100)}% dari pemasukan bulan ini (target 20%).`;
    }

    let color = 'var(--accent-primary)';
    let status = 'Sangat sehat';
    let icon = <HeartPulse size={18} color="var(--accent-primary)" />;

    if (totalScore < 50) {
      color = 'var(--accent-danger)';
      status = 'Kritis';
      icon = <AlertTriangle size={18} color="var(--accent-danger)" />;
    } else if (totalScore < 80) {
      color = 'var(--accent-sand)';
      status = 'Perlu perhatian';
      icon = <Activity size={18} color="var(--accent-sand)" />;
    }

    return { score: totalScore, color, status, message, icon };
  }, [income, expense, spendingLimit, spendingGuardState]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((healthData.score ?? 0) / 100) * circumference;

  return (
    <section className="card widget health-widget">
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Skor kesehatan</h3>
          <p className="card-sub">Arus kas, porsi tabungan, dan batas belanja</p>
        </div>
      </div>

      <div className="health-body">
        <div className="health-gauge">
          <svg width="100" height="100" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--track)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={healthData.color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="health-ring"
              style={{ '--circ': circumference, transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s' }}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="health-score-text">
            <span style={{ color: healthData.color }}>
              {healthData.score == null ? '–' : <AnimatedNumber value={healthData.score} format={scoreText} duration={1.3} />}
            </span>
          </div>
        </div>

        <div className="health-info">
          <div className="health-status-row">
            {healthData.icon}
            <strong style={{ color: healthData.color }}>{healthData.status}</strong>
          </div>
          <p className="health-message">{healthData.message}</p>
        </div>
      </div>
    </section>
  );
}
