import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrencyShort } from '../../lib/utils';
import { useFinanceStore } from '../../store/financeStore';

export default function MonthlySpendingDonut() {
  const { categories, getCategorySpending } = useFinanceStore();
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const data = useMemo(() => {
    const spending = getCategorySpending(currentMonth);
    return spending
      .map(s => {
        const cat = categories.find(c => c.id === s.category_id);
        return {
          name: cat ? cat.name : 'Lainnya',
          value: s.total,
          color: cat ? cat.color : '#cbd5e1'
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categories, getCategorySpending, currentMonth]);

  if (data.length === 0) {
    return (
      <div className="card" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '13px' }}>Belum ada pengeluaran bulan ini.</p>
      </div>
    );
  }

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="card animate-fade-in" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Peta Pengeluaran</h3>
      <div style={{ flex: 1, position: 'relative', minHeight: '180px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => formatCurrencyShort(value)}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrencyShort(total)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        {data.slice(0, 5).map((d, i) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrencyShort(d.value)}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', width: '32px', textAlign: 'right' }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
