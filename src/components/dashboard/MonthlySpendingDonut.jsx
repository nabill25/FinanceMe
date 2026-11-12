import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, getCurrentMonth, getMonthLabel } from '../../lib/utils';
import { useFinanceStore } from '../../store/financeStore';

export default function MonthlySpendingDonut() {
  const { categories, getCategorySpending, transactions } = useFinanceStore();
  const currentMonth = getCurrentMonth();

  const data = useMemo(() => getCategorySpending(currentMonth)
    .filter((s) => s.category_id) // transfer antar akun tidak berkategori
    .map((s) => {
      const cat = categories.find((c) => c.id === s.category_id);
      return { name: cat ? cat.name : s.name, value: s.total, color: cat?.color || s.color || '#8391a6' };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value), [categories, getCategorySpending, currentMonth, transactions]);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <section className="card widget">
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Peta pengeluaran</h3>
          <p className="card-sub">{getMonthLabel(currentMonth)} per kategori</p>
        </div>
        <Link to="/reports" className="widget-link">Laporan <ChevronRight size={14} /></Link>
      </div>

      {data.length === 0 ? (
        <div className="widget-empty"><p>Belum ada pengeluaran bulan ini.</p></div>
      ) : (
        <>
          {/* Tinggi eksplisit: dengan flex:1 tingginya bernilai 0 di layout satu kolom (HP) */}
          <div style={{ position: 'relative', height: '170px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={54} outerRadius={72} paddingAngle={2} dataKey="value" stroke="none">
                  {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total</span>
              <span className="amount-text" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{formatCurrency(total)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            {data.slice(0, 5).map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '12.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span className="amount-text" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(d.value)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', width: '34px', textAlign: 'right' }}>{((d.value / total) * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
