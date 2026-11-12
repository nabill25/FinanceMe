import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrency } from '../../lib/utils';
import './UpcomingBillsWidget.css';

function getDaysUntil(nextDue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = nextDue.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

function DueBadge({ days }) {
  if (days < 0) return <span className="due-badge due-overdue">Telat {Math.abs(days)} hari</span>;
  if (days === 0) return <span className="due-badge due-today">Hari ini</span>;
  if (days === 1) return <span className="due-badge due-soon">Besok</span>;
  return <span className={`due-badge ${days <= 3 ? 'due-soon' : 'due-later'}`}>{days} hari lagi</span>;
}

export default function UpcomingBillsWidget() {
  const { recurringBills } = useFinanceStore();

  const upcoming = useMemo(() => recurringBills
    .filter((b) => b.is_active && b.next_due && b.type !== 'income' && getDaysUntil(b.next_due) <= 7)
    .sort((a, b) => a.next_due.localeCompare(b.next_due))
    .slice(0, 5), [recurringBills]);

  const total = upcoming.reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <section className="upcoming-widget card widget">
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Tagihan mendatang</h3>
          <p className="card-sub">
            {upcoming.length === 0 ? '7 hari ke depan' : `7 hari ke depan · total ${formatCurrency(total)}`}
          </p>
        </div>
        <NavLink to="/recurring-bills" className="widget-link">
          Kelola <ChevronRight size={14} />
        </NavLink>
      </div>

      {upcoming.length === 0 ? (
        <div className="upcoming-empty">
          <CheckCircle2 size={18} />
          <p>Tidak ada tagihan dalam 7 hari ke depan.</p>
        </div>
      ) : (
        <div className="upcoming-bill-list">
          {upcoming.map((bill) => {
            const days = getDaysUntil(bill.next_due);
            const isUrgent = days <= 0;
            return (
              <div key={bill.id} className={`upcoming-bill-item ${isUrgent ? 'urgent' : ''}`}>
                <div className="upcoming-bill-icon" aria-hidden="true">
                  {isUrgent ? <AlertTriangle size={16} /> : <span>{bill.categories?.icon || '🧾'}</span>}
                </div>
                <div className="upcoming-bill-info">
                  <span className="upcoming-bill-name">{bill.name}</span>
                  <span className="upcoming-bill-amount amount-text">{formatCurrency(bill.amount)}</span>
                </div>
                <DueBadge days={days} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
