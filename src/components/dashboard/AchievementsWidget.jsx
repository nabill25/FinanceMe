import { useMemo } from 'react';
import { Award, Lock, CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { calculateAchievements, MEDALS } from '../../lib/achievements';
import './AchievementsWidget.css';

export default function AchievementsWidget() {
  const { transactions, budgets, getTotalBalance } = useFinanceStore();

  const unlockedIds = useMemo(() => {
    return calculateAchievements(transactions, budgets, getTotalBalance());
  }, [transactions, budgets]);

  const unlockedCount = unlockedIds.length;
  const totalMedals = MEDALS.length;
  const progressPct = (unlockedCount / totalMedals) * 100;

  return (
    <div className="achievements-widget card">
      <div className="achievements-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="achievements-icon-bg">
            <Award size={20} color="white" />
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>Pencapaian Anda</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              {unlockedCount} dari {totalMedals} Medali Terkumpul
            </p>
          </div>
        </div>
      </div>

      <div className="achievements-progress-bg">
        <div className="achievements-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="achievements-list">
        {MEDALS.map(medal => {
          const isUnlocked = unlockedIds.includes(medal.id);
          return (
            <div key={medal.id} className={`medal-item ${isUnlocked ? 'unlocked' : 'locked'}`} title={medal.desc}>
              <div className="medal-icon" style={{ background: isUnlocked ? medal.color : 'var(--border-default)' }}>
                {isUnlocked ? <CheckCircle2 size={16} color="white" /> : <Lock size={14} color="var(--text-muted)" />}
              </div>
              <span className="medal-title">{medal.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
