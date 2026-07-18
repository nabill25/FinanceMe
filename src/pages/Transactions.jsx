import { useEffect, useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, Filter, Search, ArrowUpCircle, ArrowDownCircle, Camera, Loader2, ShieldAlert, Shield } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import {
  formatCurrency, formatDate, getCurrentMonth,
  CATEGORY_ICONS, formatDateInput
} from '../lib/utils';
import { scanReceipt } from '../lib/gemini';
import { toast } from 'sonner';
import './Transactions.css';

const defaultForm = {
  type: 'expense', amount: '', description: '', date: formatDateInput(new Date()),
  account_id: '', category_id: '',
};

function TransactionModal({ open, onClose, transaction, accounts, categories, onSave }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);

  const { uploadReceipt } = useFinanceStore();
  
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(transaction?.receipt_url || null);

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || '',
        date: transaction.date,
        account_id: transaction.account_id,
        category_id: transaction.category_id,
      });
      setReceiptPreview(transaction.receipt_url || null);
    } else {
      setForm({ ...defaultForm, account_id: accounts[0]?.id || '' });
      setReceiptPreview(null);
    }
  }, [transaction, open, accounts]);

  if (!open) return null;

  const filteredCategories = categories.filter(c => c.type === form.type || form.type === 'transfer');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.account_id || !form.category_id) return;
    setSaving(true);
    try {
      let finalForm = { ...form, amount: Number(form.amount) };
      if (receiptFile) {
        const url = await uploadReceipt(receiptFile);
        if (url) finalForm.receipt_url = url;
      }
      await onSave(finalForm);
      setReceiptFile(null);
      setReceiptPreview(null);
      onClose();
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };


  const handleScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));

    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      toast.success('Foto dilampirkan, tapi API Gemini tidak diset untuk auto-scan.');
      return;
    }

    try {
      setScanning(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1];
        try {
          const result = await scanReceipt(base64String, file.type);
          
          setForm(f => ({
            ...f,
            type: result.category_type || f.type,
            amount: result.amount || f.amount,
            description: result.description || f.description
          }));
          toast.success('Struk berhasil diproses dan foto dilampirkan!');
        } catch (scanErr) {
          toast.error('Gagal scan AI: ' + scanErr.message);
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setScanning(false);
      toast.error('Gagal membaca file gambar');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal animate-slide-up">
        <div className="modal-header">
          <span className="modal-title">{transaction ? 'Edit Transaksi' : 'Transaksi Baru'}</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Type selector */}
        <div className="tx-type-tabs" style={{ marginBottom: '20px' }}>
          {['expense', 'income'].map(t => (
            <button
              key={t}
              type="button"
              className={`tx-type-btn ${form.type === t ? 'active-' + t : ''}`}
              onClick={() => setForm(f => ({ ...f, type: t, category_id: '' }))}
            >
              {t === 'expense' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
              {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Jumlah (Rp)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="form-input tx-amount-input" type="number" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0" required min="1" style={{ flex: 1 }} />
              <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current?.click()} disabled={scanning} style={{ padding: '0 12px' }} title="Lampirkan Bukti (Foto)">
                {scanning ? <Loader2 size={20} className="spin" /> : <Camera size={20} />}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleScan} accept="image/*" capture="environment" style={{ display: 'none' }} />
            </div>
            {receiptPreview && (
              <div style={{ marginTop: '10px', position: 'relative', width: 'fit-content' }}>
                <a href={receiptPreview} target="_blank" rel="noreferrer" title="Lihat ukuran penuh">
                  <img src={receiptPreview} alt="Bukti Transaksi" style={{ height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-default)' }} />
                </a>
                <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null); setForm(f => ({ ...f, receipt_url: null })); }} className="btn-icon btn-ghost" style={{ position: 'absolute', top: -10, right: -10, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', width: 24, height: 24, minWidth: 24, padding: 0 }}>✕</button>
              </div>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Akun</label>
              <select className="form-select" value={form.account_id}
                onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} required>
                <option value="">Pilih akun</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input className="form-input" type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Kategori</label>
            <div className="category-grid">
              {filteredCategories.map(cat => (
                <button key={cat.id} type="button"
                  className={`category-chip ${form.category_id === cat.id ? 'selected' : ''}`}
                  style={{ '--chip-color': cat.color }}
                  onClick={() => setForm(f => ({ ...f, category_id: cat.id }))}>
                  <span>{CATEGORY_ICONS[cat.icon] || '📂'}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Catatan (opsional)</label>
            <input className="form-input" type="text" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Deskripsi singkat..." />
          </div>

          <div className="modal-footer" style={{ padding: 0, border: 'none', margin: 0, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : (transaction ? 'Simpan' : 'Catat')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const {
    transactions, accounts, categories,
    fetchTransactions, fetchAccounts, fetchCategories,
    addTransaction, updateTransaction, deleteTransaction,
    spendingLimit, spendingGuardState, fetchSpendingLimit, checkSpendingGuard,
  } = useFinanceStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [filters, setFilters] = useState({ month: getCurrentMonth(), type: '', search: '' });

  useEffect(() => {
    if (!user) return;
    fetchAccounts(user.id);
    fetchCategories(user.id);
    fetchSpendingLimit(user.id);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchTransactions(user.id, { month: filters.month });
  }, [user, filters.month]);

  const displayed = useMemo(() => {
    let list = transactions;
    if (filters.type) list = list.filter(t => t.type === filters.type);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(t =>
        t.description?.toLowerCase().includes(s) ||
        t.categories?.name?.toLowerCase().includes(s) ||
        t.accounts?.name?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [transactions, filters.type, filters.search]);

  const totalIncome = displayed.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = displayed.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleSave = async (form) => {
    if (editTx) {
      await updateTransaction(editTx.id, form);
      toast.success('Transaksi diperbarui');
    } else {
      await addTransaction({ ...form, user_id: user.id });
      toast.success('Transaksi dicatat!');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus transaksi ini?')) return;
    try {
      await deleteTransaction(id);
      toast.success('Transaksi dihapus');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="transactions-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Transaksi</h1>
          <p className="text-secondary text-sm">Riwayat pemasukan & pengeluaran</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTx(null); setModalOpen(true); }}>
          <Plus size={16} /> Catat Transaksi
        </button>
      </div>

      {/* Spending Guard Banner */}
      {spendingLimit?.is_active && spendingGuardState && (
        spendingGuardState.blocked ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '14px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '0' }}>
            <ShieldAlert size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 700, color: '#ef4444', margin: 0 }}>🚫 Transaksi Diblokir</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Batas pengeluaran terlampaui. Coba lagi setelah: <strong style={{ color: '#ef4444', fontFamily: 'monospace' }}>{new Date(spendingGuardState.unblock_at).toLocaleString('id-ID')}</strong>
              </p>
            </div>
          </div>
        ) : spendingGuardState.pct >= 80 ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '14px 18px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: '0' }}>
            <Shield size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '13px' }}>
              ⚠️ <strong>Mendekati batas!</strong> Sudah terpakai <strong>{Math.round(spendingGuardState.pct)}%</strong> dari limit {formatCurrency(spendingLimit.limit_amount)}.
            </p>
          </div>
        ) : null
      )}

      {/* Summary */}
      <div className="tx-summary">
        <div className="tx-summary-item card">
          <div className="tx-summary-icon income"><ArrowUpCircle size={20} /></div>
          <div>
            <p className="text-xs text-muted">Pemasukan</p>
            <p className="tx-summary-amount amount-income">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
        <div className="tx-summary-item card">
          <div className="tx-summary-icon expense"><ArrowDownCircle size={20} /></div>
          <div>
            <p className="text-xs text-muted">Pengeluaran</p>
            <p className="tx-summary-amount amount-expense">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
        <div className="tx-summary-item card">
          <div className="tx-summary-icon" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}>
            <span style={{ fontSize: '20px' }}>💰</span>
          </div>
          <div>
            <p className="text-xs text-muted">Selisih</p>
            <p className={`tx-summary-amount ${totalIncome - totalExpense >= 0 ? 'amount-income' : 'amount-expense'}`}>
              {formatCurrency(Math.abs(totalIncome - totalExpense))}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="tx-filters card">
        <div className="tx-search-wrapper">
          <Search size={15} className="tx-search-icon" />
          <input className="form-input tx-search" placeholder="Cari transaksi..."
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <input type="month" className="form-input" style={{ width: 'auto' }}
          value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} />
        <div className="tabs" style={{ width: 'auto', minWidth: '200px' }}>
          {[['', 'Semua'], ['income', 'Pemasukan'], ['expense', 'Pengeluaran']].map(([v, l]) => (
            <button key={v} className={`tab ${filters.type === v ? 'active' : ''}`}
              onClick={() => setFilters(f => ({ ...f, type: v }))}>{l}</button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="card">
        {displayed.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>Belum ada transaksi</p>
            <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Catat Sekarang
            </button>
          </div>
        ) : (
          <div className="tx-list">
            {displayed.map((tx) => (
              <div key={tx.id} className="tx-item">
                <div className="tx-item-icon" style={{ background: (tx.categories?.color || '#6b7280') + '22' }}>
                  {CATEGORY_ICONS[tx.categories?.icon] || (tx.type === 'income' ? '💰' : '💸')}
                </div>
                <div className="tx-item-info">
                  <span className="tx-item-desc">
                    {tx.description || tx.categories?.name || 'Transaksi'}
                    {tx.receipt_url && <span title="Ada Lampiran Bukti" style={{ marginLeft: 6, color: 'var(--text-muted)' }}>📎</span>}
                  </span>
                  <span className="tx-item-meta">
                    <span className="badge" style={{ background: (tx.categories?.color || '#6b7280') + '22', color: tx.categories?.color || 'var(--text-secondary)', fontSize: '11px' }}>
                      {CATEGORY_ICONS[tx.categories?.icon]} {tx.categories?.name}
                    </span>
                    · {tx.accounts?.name} · {formatDate(tx.date)}
                  </span>
                </div>
                <div className="tx-item-right">
                  <span className={`tx-item-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  <div className="tx-item-actions">
                    <button className="btn btn-icon btn-ghost" onClick={() => { setEditTx(tx); setModalOpen(true); }}>
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDelete(tx.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTx(null); }}
        transaction={editTx}
        accounts={accounts}
        categories={categories}
        onSave={handleSave}
      />
    </div>
  );
}
