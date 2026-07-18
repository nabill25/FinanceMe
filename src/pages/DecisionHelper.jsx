import { useState, useMemo } from 'react';
import { ShoppingCart, CheckCircle, AlertTriangle, XCircle, Calculator } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import {
  formatCurrency, getCurrentMonth, CATEGORY_ICONS, ACCOUNT_TYPES
} from '../lib/utils';
import './DecisionHelper.css';

const RESULT_LEVELS = {
  safe: {
    icon: CheckCircle,
    label: 'Aman untuk dibeli! ✅',
    desc: 'Saldo dan anggaran mencukupi. Pembelian ini tidak akan mengganggu keuangan Anda.',
    color: 'var(--accent-success)',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Perlu dipertimbangkan ⚠️',
    desc: 'Pembelian ini akan menghabiskan sebagian besar anggaran atau saldo. Pastikan Anda punya dana darurat.',
    color: 'var(--accent-warning)',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
  },
  danger: {
    icon: XCircle,
    label: 'Sebaiknya jangan dulu ❌',
    desc: 'Saldo tidak mencukupi atau akan melampaui anggaran secara signifikan. Pertimbangkan untuk menunda.',
    color: 'var(--accent-danger)',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
  },
};

export default function DecisionHelper() {
  const { accounts, budgets, getCategorySpending } = useFinanceStore();

  const [form, setForm] = useState({
    item: '', price: '', account_id: '', category_id: '',
  });
  const [result, setResult] = useState(null);

  const currentMonth = getCurrentMonth();
  const categorySpending = getCategorySpending(currentMonth);

  const expenseBudgets = budgets.filter(b => b.categories?.type === 'expense' || true);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const selectedAccount = accounts.find(a => a.id === form.account_id);
  const selectedBudget = budgets.find(b => b.category_id === form.category_id);
  const categorySpent = form.category_id
    ? (categorySpending.find(c => c.category_id === form.category_id)?.total || 0)
    : 0;

  const analyze = () => {
    const price = Number(form.price);
    if (!price || price <= 0) return;

    const accountBalance = selectedAccount?.balance || totalBalance;
    const budgetLimit = selectedBudget?.amount;
    const remainingBudget = budgetLimit ? budgetLimit - categorySpent : null;
    const balanceAfter = accountBalance - price;

    let level = 'safe';
    const issues = [];
    const positives = [];

    // Check balance
    if (balanceAfter < 0) {
      level = 'danger';
      issues.push(`Saldo akun tidak mencukupi (kurang Rp ${formatCurrency(Math.abs(balanceAfter))})`);
    } else if (balanceAfter < price * 0.5) {
      if (level === 'safe') level = 'warning';
      issues.push(`Saldo akan sangat berkurang (sisa ${formatCurrency(balanceAfter)})`);
    } else {
      positives.push(`Saldo mencukupi, sisa ${formatCurrency(balanceAfter)}`);
    }

    // Check budget
    if (remainingBudget !== null) {
      if (price > remainingBudget) {
        if (level !== 'danger') level = 'warning';
        issues.push(`Akan melampaui anggaran sebesar ${formatCurrency(price - remainingBudget)}`);
      } else if (price > remainingBudget * 0.8) {
        if (level === 'safe') level = 'warning';
        issues.push(`Akan menghabiskan ${((price / remainingBudget) * 100).toFixed(0)}% sisa anggaran`);
      } else {
        positives.push(`Masih dalam anggaran (sisa ${formatCurrency(remainingBudget - price)})`);
      }
    } else {
      positives.push('Tidak ada batas anggaran untuk kategori ini');
    }

    // Check total balance vs price ratio
    if (price > totalBalance * 0.5) {
      if (level === 'safe') level = 'warning';
      issues.push(`Harga lebih dari 50% total aset Anda`);
    }

    setResult({
      level,
      price,
      item: form.item,
      accountBalance,
      balanceAfter,
      remainingBudget,
      remainingBudgetAfter: remainingBudget !== null ? remainingBudget - price : null,
      issues,
      positives,
    });
  };

  return (
    <div className="decision-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Cek Sebelum Beli</h1>
          <p className="text-secondary text-sm">Analisis dampak pembelian terhadap keuangan Anda</p>
        </div>
      </div>

      <div className="decision-layout">
        {/* Input form */}
        <div className="card decision-form-card">
          <div className="decision-form-icon">
            <ShoppingCart size={28} />
          </div>
          <h3 style={{ marginBottom: '20px' }}>Detail Pembelian</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nama Barang / Layanan</label>
              <input className="form-input" type="text"
                placeholder="Contoh: iPhone 15, Langganan Netflix..."
                value={form.item}
                onChange={e => setForm(f => ({ ...f, item: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Harga (Rp)</label>
              <input className="form-input decision-price-input" type="number"
                placeholder="0" min="1"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Bayar dari Akun (opsional)</label>
              <select className="form-select" value={form.account_id}
                onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">Semua akun (total saldo)</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {ACCOUNT_TYPES[a.type]?.icon} {a.name} — {formatCurrency(a.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Kategori Pengeluaran (opsional)</label>
              <select className="form-select" value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Pilih kategori (untuk cek anggaran)</option>
                {budgets.map(b => (
                  <option key={b.id} value={b.category_id}>
                    {CATEGORY_ICONS[b.categories?.icon]} {b.categories?.name}
                    {' '}(Anggaran: {formatCurrency(b.amount)})
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary btn-lg w-full" onClick={analyze} disabled={!form.price}>
              <Calculator size={18} />
              Analisis Sekarang
            </button>
          </div>

          {/* Quick info */}
          <div className="decision-quick-info">
            <div className="decision-quick-item">
              <span className="text-xs text-muted">Total Saldo</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(totalBalance)}</span>
            </div>
            {selectedAccount && (
              <div className="decision-quick-item">
                <span className="text-xs text-muted">Saldo {selectedAccount.name}</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(selectedAccount.balance)}</span>
              </div>
            )}
            {selectedBudget && (
              <div className="decision-quick-item">
                <span className="text-xs text-muted">Sisa Anggaran</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-warning)' }}>
                  {formatCurrency(selectedBudget.amount - categorySpent)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="decision-result animate-slide-up">
            {/* Verdict */}
            <div className="decision-verdict" style={{
              background: RESULT_LEVELS[result.level].bg,
              borderColor: RESULT_LEVELS[result.level].border,
            }}>
              {(() => {
                const Icon = RESULT_LEVELS[result.level].icon;
                return <Icon size={36} style={{ color: RESULT_LEVELS[result.level].color }} />;
              })()}
              <div>
                <h3 style={{ color: RESULT_LEVELS[result.level].color, fontSize: '1.1rem' }}>
                  {RESULT_LEVELS[result.level].label}
                </h3>
                <p style={{ fontSize: '14px' }}>{RESULT_LEVELS[result.level].desc}</p>
              </div>
            </div>

            {/* Item info */}
            <div className="card">
              <h4 style={{ marginBottom: '16px' }}>📦 {result.item || 'Pembelian'}</h4>
              <div className="decision-details">
                <div className="decision-detail-row">
                  <span className="text-secondary text-sm">Harga</span>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--accent-danger)' }}>
                    {formatCurrency(result.price)}
                  </span>
                </div>
                <div className="decision-detail-row">
                  <span className="text-secondary text-sm">Saldo sebelum</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(result.accountBalance)}</span>
                </div>
                <div className="decision-detail-row">
                  <span className="text-secondary text-sm">Saldo setelah</span>
                  <span style={{ fontWeight: 700, color: result.balanceAfter < 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                    {formatCurrency(Math.max(result.balanceAfter, 0))}
                    {result.balanceAfter < 0 && ' (tidak cukup)'}
                  </span>
                </div>
                {result.remainingBudget !== null && (
                  <>
                    <div className="decision-detail-row">
                      <span className="text-secondary text-sm">Sisa anggaran sebelum</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(result.remainingBudget)}</span>
                    </div>
                    <div className="decision-detail-row">
                      <span className="text-secondary text-sm">Sisa anggaran setelah</span>
                      <span style={{ fontWeight: 700, color: result.remainingBudgetAfter < 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                        {result.remainingBudgetAfter < 0
                          ? `Melampaui ${formatCurrency(Math.abs(result.remainingBudgetAfter))}`
                          : formatCurrency(result.remainingBudgetAfter)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Issues & positives */}
            {result.issues.length > 0 && (
              <div className="card decision-issues">
                <h4 style={{ marginBottom: '12px', color: 'var(--accent-warning)' }}>⚠️ Perhatian</h4>
                {result.issues.map((issue, i) => (
                  <div key={i} className="decision-issue-item">
                    <XCircle size={14} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
                    <span className="text-sm">{issue}</span>
                  </div>
                ))}
              </div>
            )}

            {result.positives.length > 0 && (
              <div className="card decision-positives">
                <h4 style={{ marginBottom: '12px', color: 'var(--accent-success)' }}>✅ Yang Baik</h4>
                {result.positives.map((pos, i) => (
                  <div key={i} className="decision-issue-item">
                    <CheckCircle size={14} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
                    <span className="text-sm">{pos}</span>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-ghost w-full" onClick={() => setResult(null)}>
              Cek Pembelian Lain
            </button>
          </div>
        )}

        {!result && (
          <div className="decision-placeholder">
            <div className="decision-placeholder-inner">
              <div className="decision-placeholder-icon">🤔</div>
              <h3>Masukkan detail pembelian</h3>
              <p className="text-secondary text-sm">Isi form di sebelah kiri untuk mendapatkan rekomendasi sebelum membeli</p>
              <ul className="decision-tips">
                <li>💡 Pastikan Anda sudah punya saldo akun terdaftar</li>
                <li>💡 Buat anggaran bulanan untuk analisis lebih akurat</li>
                <li>💡 Gunakan fitur ini sebelum setiap pembelian besar</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
