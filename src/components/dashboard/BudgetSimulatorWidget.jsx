import { useState } from 'react';
import { Target, TrendingDown, ArrowRight, AlertTriangle, HelpCircle } from 'lucide-react';
import { formatCurrencyShort } from '../../lib/utils';
import { useFinanceStore } from '../../store/financeStore';

export default function BudgetSimulatorWidget() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const { transactions, categories, budgets, accounts } = useFinanceStore();

  // 1. Hitung total saldo
  const totalBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  
  // 2. Hitung budget
  const numAmount = Number(amount) || 0;
  
  const currentMonth = new Date().toISOString().slice(0,7); // YYYY-MM
  const monthTxs = transactions.filter(t => t.date.startsWith(currentMonth));
  
  let budgetImpact = null;
  if (category && numAmount > 0) {
    const selectedBudget = budgets.find(b => b.category_id === category && b.month === currentMonth);
    if (selectedBudget) {
      const spent = monthTxs
        .filter(t => t.category_id === category && t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
      
      const remainingBefore = selectedBudget.amount - spent;
      const remainingAfter = remainingBefore - numAmount;
      const pctAfter = ((spent + numAmount) / selectedBudget.amount) * 100;
      
      budgetImpact = {
        name: categories.find(c => c.id === category)?.name || 'Kategori',
        remainingBefore,
        remainingAfter,
        pctAfter
      };
    }
  }

  const balancePct = totalBalance > 0 ? (numAmount / totalBalance) * 100 : 0;

  return (
    <div className="card animate-fade-in" style={{ padding: '20px', background: 'var(--surface-default)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ padding: '8px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', color: '#3b82f6' }}>
          <HelpCircle size={18} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Cek Pembelian</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Simulasi dampak keuanganku</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input 
          type="number" 
          className="form-input" 
          placeholder="Rp Harga Barang" 
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{ flex: 1 }}
        />
        <select 
          className="form-input" 
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">Pilih Kategori...</option>
          {categories.filter(c => c.type === 'expense').map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {numAmount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg-default)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          
          {/* Dampak Saldo */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mengambil dari Saldo</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: balancePct > 50 ? '#ef4444' : 'var(--text-primary)' }}>
                {balancePct.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--surface-default)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(balancePct, 100)}%`, background: balancePct > 50 ? '#ef4444' : '#3b82f6', transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Dampak Budget */}
          {budgetImpact && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sisa Budget {budgetImpact.name}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: budgetImpact.remainingAfter < 0 ? '#ef4444' : budgetImpact.remainingAfter < budgetImpact.remainingBefore * 0.2 ? '#f59e0b' : '#10b981' }}>
                  {formatCurrencyShort(budgetImpact.remainingAfter)}
                </span>
              </div>
              <div style={{ height: '6px', background: 'var(--surface-default)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(budgetImpact.pctAfter, 100)}%`, background: budgetImpact.pctAfter > 100 ? '#ef4444' : budgetImpact.pctAfter > 80 ? '#f59e0b' : '#10b981', transition: 'width 0.3s' }} />
              </div>
              {budgetImpact.pctAfter > 100 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#ef4444', fontSize: '11px' }}>
                  <AlertTriangle size={12} />
                  <span>Akan melebihi batas budget bulanan!</span>
                </div>
              )}
            </div>
          )}

          {!budgetImpact && category && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Tidak ada target budget untuk kategori ini bulan ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
