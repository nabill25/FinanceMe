import { useMemo } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { getCurrentMonth } from '../../lib/utils';
import { Activity, ShieldCheck, HeartPulse, AlertTriangle } from 'lucide-react';
import './FinancialHealthWidget.css';

export default function FinancialHealthWidget() {
  const { getMonthSummary, spendingLimit, spendingGuardState } = useFinanceStore();
  const currentMonth = getCurrentMonth();
  const { income, expense } = getMonthSummary(currentMonth);

  const healthData = useMemo(() => {
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

    let color = 'var(--accent-success)';
    let status = 'Sangat Sehat';
    let message = 'Luar biasa! Pertahankan kebiasaan baik ini.';
    let icon = <HeartPulse size={24} color="var(--accent-success)" />;

    if (totalScore < 50) {
      color = 'var(--accent-danger)';
      status = 'Kritis';
      message = 'Awas! Pengeluaranmu jauh melebihi pendapatan.';
      icon = <AlertTriangle size={24} color="var(--accent-danger)" />;
    } else if (totalScore < 80) {
      color = 'var(--accent-warning)';
      status = 'Perlu Perhatian';
      message = 'Arus kas mulai seret. Kurangi pengeluaran yang tidak perlu.';
      icon = <Activity size={24} color="var(--accent-warning)" />;
    }

    return { score: totalScore, color, status, message, icon };
  }, [income, expense, spendingLimit, spendingGuardState]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthData.score / 100) * circumference;

  return (
    <div className="card health-widget">
      <div className="health-header">
        <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Skor Kesehatan <ShieldCheck size={16} className="text-primary" />
        </h3>
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
              stroke="var(--border-default)"
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
              style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s' }}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="health-score-text">
            <span style={{ color: healthData.color }}>{healthData.score}</span>
          </div>
        </div>

        <div className="health-info">
          <div className="health-status-row">
            {healthData.icon}
            <strong style={{ color: healthData.color, fontSize: '15px' }}>{healthData.status}</strong>
          </div>
          <p className="health-message">{healthData.message}</p>
        </div>
      </div>
    </div>
  );
}
