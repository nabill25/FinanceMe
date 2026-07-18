import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { formatCurrencyShort, formatDate, CATEGORY_ICONS } from '../lib/utils';
import './CalendarView.css';

export default function CalendarView() {
  const { transactions } = useFinanceStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  
  const monthName = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // Navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Generate calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0 or Sunday is 0 (JS getDay: Sun=0, Mon=1)
  // We'll use standard Sun-Sat (0-6)
  
  const calendarDays = useMemo(() => {
    const days = [];
    // Blank days before 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, dateStr });
    }
    return days;
  }, [month, year, daysInMonth, firstDayOfMonth]);

  // Group transactions by date
  const txByDate = useMemo(() => {
    const groups = {};
    transactions.forEach(tx => {
      // tx.date format: "YYYY-MM-DD"
      if (!groups[tx.date]) {
        groups[tx.date] = { income: 0, expense: 0, list: [] };
      }
      groups[tx.date].list.push(tx);
      if (tx.type === 'income') groups[tx.date].income += tx.amount;
      if (tx.type === 'expense') groups[tx.date].expense += tx.amount;
    });
    return groups;
  }, [transactions]);

  // Modal logic
  const selectedDayTx = selectedDate ? txByDate[selectedDate]?.list || [] : [];
  const selectedDayIncome = selectedDate ? txByDate[selectedDate]?.income || 0 : 0;
  const selectedDayExpense = selectedDate ? txByDate[selectedDate]?.expense || 0 : 0;

  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="calendar-view animate-fade-in">
      <div className="calendar-header-bar">
        <div>
          <h1 className="page-title">Kalender</h1>
          <p className="text-secondary text-sm">Lihat aktivitas harian Anda</p>
        </div>
        <div className="calendar-nav">
          <button className="btn btn-outline btn-sm" onClick={prevMonth}>
            <ChevronLeft size={16} />
          </button>
          <span className="calendar-month-title">{monthName}</span>
          <button className="btn btn-outline btn-sm" onClick={nextMonth}>
            <ChevronRight size={16} />
          </button>
          <button className="btn btn-primary btn-sm ml-2" onClick={goToToday}>Hari Ini</button>
        </div>
      </div>

      <div className="card calendar-container">
        <div className="calendar-grid">
          {weekDays.map(wd => (
            <div key={wd} className="calendar-weekday">{wd}</div>
          ))}
          
          {calendarDays.map((item, idx) => {
            if (!item) return <div key={`blank-${idx}`} className="calendar-day blank"></div>;

            const { day, dateStr } = item;
            const data = txByDate[dateStr];
            const isToday = dateStr === todayStr;

            return (
              <div 
                key={dateStr} 
                className={`calendar-day ${isToday ? 'is-today' : ''} ${data ? 'has-tx' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <div className="day-number">{day}</div>
                {data && (
                  <div className="day-summary">
                    {data.income > 0 && (
                      <div className="day-income">+{formatCurrencyShort(data.income)}</div>
                    )}
                    {data.expense > 0 && (
                      <div className="day-expense">-{formatCurrencyShort(data.expense)}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Transactions Modal */}
      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Transaksi Harian</span>
                <p className="text-secondary" style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                  {formatDate(selectedDate)}
                </p>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setSelectedDate(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="daily-summary-row" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1, padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', color: 'var(--accent-success)' }}>
                  <div style={{ fontSize: '12px' }}>Pemasukan</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>+{formatCurrencyShort(selectedDayIncome)}</div>
                </div>
                <div style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: 'var(--accent-danger)' }}>
                  <div style={{ fontSize: '12px' }}>Pengeluaran</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>-{formatCurrencyShort(selectedDayExpense)}</div>
                </div>
              </div>

              {selectedDayTx.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <CalendarIcon size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <p>Tidak ada transaksi di hari ini.</p>
                </div>
              ) : (
                <div className="tx-list">
                  {selectedDayTx.map(tx => (
                    <div key={tx.id} className="tx-item">
                      <div className="tx-item-icon" style={{ background: (tx.categories?.color || '#6b7280') + '22' }}>
                        {CATEGORY_ICONS[tx.categories?.icon] || (tx.type === 'income' ? '💰' : '💸')}
                      </div>
                      <div className="tx-item-info">
                        <div className="tx-item-desc">{tx.description || tx.categories?.name}</div>
                        <div className="tx-item-meta">{tx.accounts?.name}</div>
                      </div>
                      <div className={`tx-item-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrencyShort(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
