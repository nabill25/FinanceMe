import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { formatCurrencyShort, formatDate, CATEGORY_ICONS, EXCHANGE_RATES } from '../lib/utils';
import BottomSheet from '../components/BottomSheet';
import './CalendarView.css';

// Nominal ringkas untuk sel kalender yang sempit di HP: 1,2jt · 350rb
const formatCompact = (n) => {
  const abs = Math.abs(n);
  const fmt = (v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(v);
  if (abs >= 1e9) return `${fmt(n / 1e9)}M`;
  if (abs >= 1e6) return `${fmt(n / 1e6)}jt`;
  if (abs >= 1e3) return `${fmt(n / 1e3)}rb`;
  return fmt(n);
};

export default function CalendarView() {
  const { transactions } = useFinanceStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  // Arah pindah bulan (-1 mundur, 1 maju): grid kalender meluncur dari sisi itu
  const [slideDir, setSlideDir] = useState(0);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  
  const monthName = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // Navigation
  const prevMonth = () => { setSlideDir(-1); setCurrentDate(new Date(year, month - 1, 1)); };
  const nextMonth = () => { setSlideDir(1); setCurrentDate(new Date(year, month + 1, 1)); };
  const goToToday = () => {
    const now = new Date();
    setSlideDir(Math.sign((now.getFullYear() - year) * 12 + now.getMonth() - month));
    setCurrentDate(now);
  };

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
      const rate = EXCHANGE_RATES[tx.accounts?.currency || 'IDR'] || 1;
      groups[tx.date].list.push(tx);
      if (tx.type === 'income') groups[tx.date].income += (tx.amount * rate);
      if (tx.type === 'expense') groups[tx.date].expense += (tx.amount * rate);
    });
    return groups;
  }, [transactions]);

  // Modal logic
  const selectedDayTx = selectedDate ? txByDate[selectedDate]?.list || [] : [];
  const selectedDayIncome = selectedDate ? txByDate[selectedDate]?.income || 0 : 0;
  const selectedDayExpense = selectedDate ? txByDate[selectedDate]?.expense || 0 : 0;

  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  // Tanggal lokal (WIB); toISOString() memakai UTC sehingga sebelum jam 07.00 menandai hari kemarin
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="calendar-view animate-fade-in">
      <div className="calendar-header-bar">
        <div>
          <h1 className="page-title">Kalender</h1>
          <p className="text-secondary text-sm">Lihat aktivitas harian Anda</p>
        </div>
        <div className="calendar-nav">
          <button className="btn btn-outline btn-icon" onClick={prevMonth} aria-label="Bulan sebelumnya">
            <ChevronLeft size={18} />
          </button>
          <span className="calendar-month-title" key={monthName} style={{ '--cal-dir': slideDir }}>{monthName}</span>
          <button className="btn btn-outline btn-icon" onClick={nextMonth} aria-label="Bulan berikutnya">
            <ChevronRight size={18} />
          </button>
          <button className="btn btn-primary btn-sm ml-2" onClick={goToToday}>Hari Ini</button>
        </div>
      </div>

      <div className="card calendar-container">
        <div className="calendar-grid" key={`${year}-${month}`} style={{ '--cal-dir': slideDir }}>
          {weekDays.map(wd => (
            <div key={wd} className="calendar-weekday">{wd}</div>
          ))}
          
          {calendarDays.map((item, idx) => {
            if (!item) return <div key={`blank-${idx}`} className="calendar-day blank"></div>;

            const { day, dateStr } = item;
            const data = txByDate[dateStr];
            const isToday = dateStr === todayStr;

            return (
              <button
                type="button"
                key={dateStr}
                className={`calendar-day ${isToday ? 'is-today' : ''} ${data ? 'has-tx' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
                aria-label={`${day} ${monthName}${data ? ', ada transaksi' : ''}`}
              >
                <span className="day-number">{day}</span>
                {data && (
                  <span className="day-summary">
                    {/* Tanpa tanda +/- agar muat di sel sempit; warna hijau/merah sudah membedakannya */}
                    {data.income > 0 && (
                      <span className="day-income">{formatCompact(data.income)}</span>
                    )}
                    {data.expense > 0 && (
                      <span className="day-expense">{formatCompact(data.expense)}</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Transactions Modal */}
      <BottomSheet 
        isOpen={!!selectedDate} 
        onClose={() => setSelectedDate(null)} 
        title={
          <div>
            <span>Transaksi Harian</span>
            <p className="text-secondary" style={{ fontSize: '13px', margin: '4px 0 0 0', fontWeight: 'normal' }}>
              {selectedDate && formatDate(selectedDate)}
            </p>
          </div>
        }
      >
        <div className="modal-body" style={{ padding: 0 }}>
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
                        {tx.type === 'income' ? '+' : '-'}{formatCurrencyShort(tx.amount, tx.accounts?.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
      </BottomSheet>
    </div>
  );
}
