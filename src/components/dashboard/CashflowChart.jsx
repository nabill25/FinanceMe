import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrencyShort, formatDateShort } from '../../lib/utils';
import './CashflowChart.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="cashflow-tooltip">
        <p className="cashflow-tooltip-label">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {formatCurrencyShort(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CashflowChart({ days = 30 }) {
  const { transactions } = useFinanceStore();

  const chartData = useMemo(() => {
    const now = new Date();
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayTxs = transactions.filter(t => t.date === dateStr);
      data.push({
        date: formatDateShort(dateStr),
        income: dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
    }
    return data;
  }, [transactions, days]);

  return (
    <div className="cashflow-chart card">
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px' }}>Arus Kas {days} Hari Terakhir</h3>
        <div className="cashflow-legend">
          <span className="cashflow-legend-item">
            <span className="legend-dot" style={{ background: '#10b981' }} />
            Pemasukan
          </span>
          <span className="cashflow-legend-item">
            <span className="legend-dot" style={{ background: '#ef4444' }} />
            Pengeluaran
          </span>
        </div>
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(days / 7)}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrencyShort}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="income"
              name="Pemasukan"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#incomeGrad)"
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="Pengeluaran"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#expenseGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
