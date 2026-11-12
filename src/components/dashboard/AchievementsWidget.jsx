import { useMemo } from 'react';
import { Lock, Check } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { calculateAchievements, MEDALS } from '../../lib/achievements';
import './AchievementsWidget.css';

export default function AchievementsWidget() {
  const { transactions, budgets, getTotalBalance } = useFinanceStore();

  const unlockedIds = useMemo(
    () => calculateAchievements(transactions, budgets, getTotalBalance()),
    [transactions, budgets, getTotalBalance],
  );

  const unlockedCount = unlockedIds.length;
  const totalMedals = MEDALS.length;

  return (
    <section className="achievements-widget card widget">
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Pencapaian</h3>
          <p className="card-sub">{unlockedCount} dari {totalMedals} medali terkumpul</p>
        </div>
      </div>

      <span className="budget-track achievements-track">
        <span className="budget-fill" style={{ width: `${(unlockedCount / totalMedals) * 100}%` }} />
      </span>

      <div className="achievements-list">
        {MEDALS.map((medal) => {
          const isUnlocked = unlockedIds.includes(medal.id);
          return (
            <div key={medal.id} className={`medal-item ${isUnlocked ? 'unlocked' : 'locked'}`} title={medal.desc}>
              <span className="medal-icon" aria-hidden="true">
                {isUnlocked ? <Check size={14} strokeWidth={2.6} /> : <Lock size={12} />}
              </span>
              <span className="medal-text">
                <span className="medal-title">{medal.title}</span>
                <span className="medal-desc">{medal.desc}</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
