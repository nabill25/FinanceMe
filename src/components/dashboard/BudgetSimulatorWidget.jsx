import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency, getCurrentMonth } from '../../lib/utils';
import { useFinanceStore } from '../../store/financeStore';

const bar = (pct, color) => (
  <span style={{ display: 'block', height: 8, borderRadius: 6, background: 'var(--track)', overflow: 'hidden' }}>
    <span style={{ display: 'block', height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 6, background: color, transition: 'width 0.3s ease' }} />
  </span>
);

/** Simulasi: kalau barang ini dibeli, berapa porsi saldo dan sisa anggaran kategorinya. */
export default function BudgetSimulatorWidget() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const { transactions, categories, budgets, accounts } = useFinanceStore();

  const totalBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  const numAmount = Number(amount) || 0;
  const currentMonth = getCurrentMonth();
  const monthTxs = transactions.filter((t) => t.date?.startsWith(currentMonth));

  let budgetImpact = null;
  if (category && numAmount > 0) {
    const selectedBudget = budgets.find((b) => b.category_id === category && (!b.month || b.month === currentMonth));
    if (selectedBudget) {
      const spent = monthTxs
        .filter((t) => t.category_id === category && t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
      const remainingBefore = selectedBudget.amount - spent;
      budgetImpact = {
        name: categories.find((c) => c.id === category)?.name || 'Kategori',
        remainingBefore,
        remainingAfter: remainingBefore - numAmount,
        pctAfter: ((spent + numAmount) / selectedBudget.amount) * 100,
      };
    }
  }

  const balancePct = totalBalance > 0 ? (numAmount / totalBalance) * 100 : 0;
  const impactColor = !budgetImpact ? 'var(--accent-primary)'
    : budgetImpact.pctAfter > 100 ? 'var(--accent-danger)'
      : budgetImpact.pctAfter > 80 ? 'var(--accent-sand)' : 'var(--accent-primary)';

  return (
    <section className="card widget">
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Cek pembelian</h3>
          <p className="card-sub">Lihat dampaknya ke saldo & anggaran sebelum membeli</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: numAmount > 0 ? '14px' : 0 }}>
        <input
          type="number"
          inputMode="numeric"
          className="form-input"
          placeholder="Harga (Rp)"
          aria-label="Harga barang"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
        <select
          className="form-input"
          aria-label="Kategori"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        >
          <option value="">Kategori…</option>
          {categories.filter((c) => c.type === 'expense').map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {numAmount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px', background: 'var(--input-bg)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Porsi dari total saldo</span>
              <span style={{ fontWeight: 500, color: balancePct > 50 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                {balancePct.toFixed(1).replace('.', ',')}%
              </span>
            </div>
            {bar(balancePct, balancePct > 50 ? 'var(--accent-danger)' : 'var(--accent-primary)')}
          </div>

          {budgetImpact && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: '7px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sisa anggaran {budgetImpact.name}</span>
                <span className="amount-text" style={{ fontWeight: 500, color: impactColor }}>
                  {formatCurrency(budgetImpact.remainingAfter)}
                </span>
              </div>
              {bar(budgetImpact.pctAfter, impactColor)}
              {budgetImpact.pctAfter > 100 && (
                <p style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--accent-danger)', fontSize: '12px' }}>
                  <AlertTriangle size={13} /> Pembelian ini membuat anggaran bulan ini terlampaui.
                </p>
              )}
            </div>
          )}

          {!budgetImpact && category && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Belum ada anggaran untuk kategori ini bulan ini.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
