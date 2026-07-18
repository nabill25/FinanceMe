import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarClock, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrencyShort } from '../../lib/utils';
import './UpcomingBillsWidget.css';

function getDaysUntil(nextDue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDue);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function DueBadge({ days }) {
  if (days < 0) return <span className="due-badge due-overdue">Telat {Math.abs(days)}h</span>;
  if (days === 0) return <span className="due-badge due-today">Hari ini</span>;
  if (days <= 3) return <span className="due-badge due-soon">{days} hari lagi</span>;
  return <span className="due-badge due-later">{days} hari lagi</span>;
}

export default function UpcomingBillsWidget() {
  const { recurringBills } = useFinanceStore();

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(today.getDate() + 7);

    return recurringBills
      .filter(b => b.is_active && new Date(b.next_due) <= limit)
      .sort((a, b) => new Date(a.next_due) - new Date(b.next_due))
      .slice(0, 5);
  }, [recurringBills]);

  if (upcoming.length === 0) {
    return (
      <div className="upcoming-widget card">
        <div className="upcoming-widget-header">
          <div className="upcoming-widget-title">
            <CalendarClock size={16} />
            <span>Tagihan Mendatang</span>
          </div>
          <NavLink to="/recurring-bills" className="upcoming-widget-link">
            Kelola <ChevronRight size={14} />
          </NavLink>
        </div>
        <div className="upcoming-empty">
          <CheckCircle2 size={28} style={{ color: 'var(--accent-success)' }} />
          <p>Tidak ada tagihan dalam 7 hari ke depan 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upcoming-widget card">
      <div className="upcoming-widget-header">
        <div className="upcoming-widget-title">
          <CalendarClock size={16} />
          <span>Tagihan Mendatang</span>
        </div>
        <NavLink to="/recurring-bills" className="upcoming-widget-link">
          Kelola <ChevronRight size={14} />
        </NavLink>
      </div>

      <div className="upcoming-bill-list">
        {upcoming.map((bill, i) => {
          const days = getDaysUntil(bill.next_due);
          const isUrgent = days <= 0;
          return (
            <div
              key={bill.id}
              className={`upcoming-bill-item ${isUrgent ? 'urgent' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="upcoming-bill-icon" style={{ background: bill.categories?.color ? `${bill.categories.color}20` : 'var(--border-subtle)' }}>
                {isUrgent ? <AlertTriangle size={16} style={{ color: 'var(--accent-danger)' }} /> : <span style={{ fontSize: 16 }}>{bill.categories?.icon || '💸'}</span>}
              </div>
              <div className="upcoming-bill-info">
                <span className="upcoming-bill-name">{bill.name}</span>
                <span className="upcoming-bill-amount">{formatCurrencyShort(bill.amount)}</span>
              </div>
              <DueBadge days={days} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
