import { Link } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrency } from '../../lib/utils';

/** Target tabungan yang paling dekat tercapai (persentase tertinggi yang belum 100%). */
export default function GoalProgressCard() {
  const { goals } = useFinanceStore();

  const ranked = (goals || [])
    .filter((g) => g.target_amount > 0)
    .map((g) => ({ ...g, pct: Math.min((g.current_amount / g.target_amount) * 100, 100) }))
    .sort((a, b) => (a.pct >= 100) - (b.pct >= 100) || b.pct - a.pct);
  const goal = ranked[0];

  return (
    <section className="card widget">
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Target tabungan</h3>
          <p className="card-sub">{goal ? `${goal.name} · ${ranked.length} target` : 'Belum ada target'}</p>
        </div>
        <Link to="/goals" className="widget-link">Semua <ChevronRight size={14} /></Link>
      </div>

      {!goal ? (
        <div className="widget-empty">
          <p>Buat target seperti dana darurat atau liburan, lalu pantau progresnya di sini.</p>
          <Link to="/goals" className="pill-btn"><Plus size={14} /> Buat target</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <span className="amount-text" style={{ fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em' }}>
              {formatCurrency(goal.current_amount)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--accent-primary)', fontWeight: 500 }}>{goal.pct.toFixed(0)}%</span>
          </div>
          <span className="budget-track">
            <span className="budget-fill" style={{ width: `${goal.pct}%` }} />
          </span>
          <p className="card-sub amount-text" style={{ marginTop: 8 }}>
            Sisa {formatCurrency(Math.max(goal.target_amount - goal.current_amount, 0))} dari target {formatCurrency(goal.target_amount)}
          </p>
        </>
      )}
    </section>
  );
}
