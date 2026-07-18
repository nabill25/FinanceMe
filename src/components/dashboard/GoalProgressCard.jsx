import { useFinanceStore } from '../../store/financeStore';
import { Target } from 'lucide-react';
import { formatCurrencyShort } from '../../lib/utils';
import { Link } from 'react-router-dom';

export default function GoalProgressCard() {
  const { goals } = useFinanceStore();

  if (!goals || goals.length === 0) {
    return (
      <Link to="/goals" className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', textDecoration: 'none' }}>
        <Target size={24} style={{ marginBottom: '8px' }} />
        <p style={{ fontSize: '13px', margin: 0 }}>Belum ada target tabungan.</p>
        <span style={{ fontSize: '12px', color: 'var(--primary-main)', marginTop: '4px' }}>Buat Target Baru &rarr;</span>
      </Link>
    );
  }

  // Get the most urgent / active goal
  const topGoal = goals[0]; // Simplified for now
  const pct = Math.min((topGoal.current_amount / topGoal.target_amount) * 100, 100);

  return (
    <div className="card animate-fade-in" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', color: '#10b981' }}>
            <Target size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Progress Tabungan</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{topGoal.name}</p>
          </div>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-main)' }}>
          {pct.toFixed(0)}%
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Terkumpul: {formatCurrencyShort(topGoal.current_amount)}</span>
        <span style={{ color: 'var(--text-muted)' }}>Target: {formatCurrencyShort(topGoal.target_amount)}</span>
      </div>

      <div style={{ height: '8px', background: 'var(--surface-default)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gradient-primary)', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}
