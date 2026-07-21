import { useEffect, useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, Search, ArrowUpCircle, ArrowDownCircle, Loader2, ShieldAlert, Shield, ImagePlus, SlidersHorizontal, X } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import {
  formatCurrency, formatDate, getCurrentMonth,
  CATEGORY_ICONS, formatDateInput, EXCHANGE_RATES
} from '../lib/utils';
import { scanReceipt, guessCategory } from '../lib/gemini';
import { exportTransactionsToPDF, exportTransactionsToExcel } from '../lib/exportUtils';
import { toast } from 'sonner';
import TagInput from '../components/TagInput';
import './Transactions.css';

const defaultForm = {
  type: 'expense', amount: '', description: '', date: formatDateInput(new Date()),
  account_id: '', category_id: '', tags: []
};

function TransactionModal({ open, onClose, transaction, accounts, categories, onSave }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [guessingCategory, setGuessingCategory] = useState(false);
  const fileInputRef = useRef(null);

  const [isSplit, setIsSplit] = useState(false);
  const [splitDetails, setSplitDetails] = useState([]);

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
        tags: transaction.tags || [],
      });
      setReceiptPreview(transaction.receipt_url || null);
      setIsSplit(transaction.is_split || false);
      setSplitDetails(transaction.split_details || []);
    } else {
      setForm({ ...defaultForm, account_id: accounts[0]?.id || '' });
      setReceiptPreview(null);
      setIsSplit(false);
      setSplitDetails([]);
    }
  }, [transaction, open, accounts]);

  if (!open) return null;

  const filteredCategories = categories.filter(c => c.type === form.type || form.type === 'transfer');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.account_id || !form.category_id) return;
    setSaving(true);
    try {
      let finalForm = { 
        ...form, 
        amount: Number(form.amount),
        is_split: form.type === 'expense' ? isSplit : false,
        split_details: form.type === 'expense' && isSplit ? splitDetails : null
      };
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
          const result = await scanReceipt(base64String, file.type, categories);
          
          setForm(f => ({
            ...f,
            type: result.category_type || f.type,
            amount: result.amount || f.amount,
            description: result.description || f.description,
            category_id: result.category_id || f.category_id,
            date: result.date || f.date
          }));
          
          if (result.items && Array.isArray(result.items) && result.items.length > 0) {
            setIsSplit(true);
            setSplitDetails(result.items.map(item => ({
              name: item.name,
              amount: item.amount
            })));
            toast.success(`Struk diproses! ${result.items.length} barang terdeteksi sebagai Split Bill.`);
          } else {
            toast.success('Struk berhasil diproses dan dikategorikan!');
          }
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

  const handleGuessCategory = async () => {
    if (!form.description || form.description.length < 3) return;
    if (!import.meta.env.VITE_GEMINI_API_KEY) return;
    
    setGuessingCategory(true);
    try {
      const guessedId = await guessCategory(form.description, form.type, categories);
      if (guessedId && guessedId !== form.category_id) {
        setForm(f => ({ ...f, category_id: guessedId }));
        toast.success('Kategori ditebak oleh AI!');
      }
    } catch (err) {
      console.error('Guess category err:', err);
    } finally {
      setGuessingCategory(false);
    }
  };

  const handleDescriptionBlur = () => {
    if (form.description && form.description.length >= 3 && !form.category_id) {
      handleGuessCategory();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal animate-slide-up">
        <div className="modal-header">
          <span className="modal-title">{transaction ? 'Edit Transaksi' : 'Transaksi Baru'}</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto' }}>
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
              <label className="form-label">Nominal ({accounts.find(a => a.id === form.account_id)?.currency || 'IDR'})</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="form-input tx-amount-input" type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" required min="1" style={{ flex: 1 }} />
                <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current?.click()} disabled={scanning} style={{ padding: '0 12px', flexShrink: 0 }} title="Pilih Bukti (Foto/Galeri)">
                  {scanning ? <Loader2 size={20} className="spin" /> : <ImagePlus size={20} />}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleScan} accept="image/*" style={{ display: 'none' }} />
              </div>
              {receiptPreview && (
                <div className="receipt-preview-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', marginTop: '12px' }}>
                  <img src={receiptPreview} alt="Receipt Preview" className="receipt-preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                  {scanning && (
                    <div className="scanning-overlay">
                      <div className="scanner-line"></div>
                      <div className="scanner-text">AI sedang membaca struk...</div>
                    </div>
                  )}
                  {!scanning && (
                    <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null); setForm(f => ({ ...f, receipt_url: null })); }} className="btn-icon btn-ghost receipt-remove" style={{ position: 'absolute', top: 4, right: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', width: 24, height: 24, minWidth: 24, padding: 0 }}>✕</button>
                  )}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Kategori</label>
                {guessingCategory && <span style={{ fontSize: '11px', color: 'var(--accent-primary)' }} className="animate-pulse">✨ AI berpikir...</span>}
              </div>
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

            {form.type === 'expense' && (
              <div className="form-group split-bill-section" style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isSplit ? '16px' : '0' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>🍕 Split Bill (Patungan)</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bagikan tagihan ini dengan teman</div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={isSplit} onChange={(e) => setIsSplit(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>

                {isSplit && (
                  <div className="split-bill-details" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {splitDetails.map((detail, idx) => (
                      <div key={detail.id || idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="text" className="form-input" placeholder="Nama" value={detail.name} style={{ flex: 1 }}
                          onChange={e => {
                            const newDetails = [...splitDetails];
                            newDetails[idx].name = e.target.value;
                            setSplitDetails(newDetails);
                          }} required />
                        <input type="number" className="form-input" placeholder="Nominal" value={detail.amount} style={{ width: '120px' }} min="1"
                          onChange={e => {
                            const newDetails = [...splitDetails];
                            newDetails[idx].amount = Number(e.target.value);
                            setSplitDetails(newDetails);
                          }} required />
                        <button type="button" className="btn-icon btn-ghost" onClick={() => {
                          setSplitDetails(splitDetails.filter((_, i) => i !== idx));
                        }}>
                          <Trash2 size={16} color="var(--accent-danger)" />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                      setSplitDetails([...splitDetails, { id: Date.now(), name: '', amount: '', is_paid: false }]);
                    }} style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
                      <Plus size={14} /> Tambah Teman
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Catatan (opsional)</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type="text" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  onBlur={handleDescriptionBlur}
                  placeholder="Deskripsi singkat..." 
                  style={{ paddingRight: '40px' }}
                />
                <button type="button" 
                  className="btn-icon btn-ghost" 
                  title="Tebak Kategori dengan AI"
                  onClick={handleGuessCategory}
                  disabled={guessingCategory || !form.description}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', opacity: (!form.description || guessingCategory) ? 0.5 : 1 }}
                >
                  {guessingCategory ? <Loader2 size={16} className="spin" /> : '✨'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tag / Label</label>
              <TagInput tags={form.tags} onChange={tags => setForm({ ...form, tags })} />
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
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [filters, setFilters] = useState({ 
    month: getCurrentMonth(), 
    type: '', 
    search: '',
    categoryId: '',
    accountId: '',
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    if (!user) return;
    fetchAccounts(user.id);
    fetchCategories(user.id);
    fetchSpendingLimit(user.id);
  }, [user, fetchAccounts, fetchCategories, fetchSpendingLimit]);

  useEffect(() => {
    if (!user) return;
    fetchTransactions(user.id, { month: filters.month });
  }, [user, filters.month, fetchTransactions]);

  const displayed = useMemo(() => {
    let list = transactions;
    if (filters.type) list = list.filter(t => t.type === filters.type);
    if (filters.categoryId) list = list.filter(t => t.category_id === filters.categoryId);
    if (filters.accountId) list = list.filter(t => t.account_id === filters.accountId);
    if (filters.minAmount) list = list.filter(t => t.amount >= Number(filters.minAmount));
    if (filters.maxAmount) list = list.filter(t => t.amount <= Number(filters.maxAmount));
    
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(t =>
        t.description?.toLowerCase().includes(s) ||
        t.categories?.name?.toLowerCase().includes(s) ||
        t.accounts?.name?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [transactions, filters]);

  const totalIncome = displayed.filter(t => t.type === 'income').reduce((s, t) => {
    const rate = EXCHANGE_RATES[t.accounts?.currency || 'IDR'] || 1;
    return s + (t.amount * rate);
  }, 0);
  const totalExpense = displayed.filter(t => t.type === 'expense').reduce((s, t) => {
    const rate = EXCHANGE_RATES[t.accounts?.currency || 'IDR'] || 1;
    return s + (t.amount * rate);
  }, 0);

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
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => exportTransactionsToPDF(displayed, filters.month)}>
            PDF
          </button>
          <button className="btn btn-outline" onClick={() => exportTransactionsToExcel(displayed, filters.month)}>
            Excel
          </button>
          <button className="btn btn-primary" onClick={() => { setEditTx(null); setModalOpen(true); }}>
            <Plus size={16} /> Catat
          </button>
        </div>
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

      {/* Controls */}
      <div className="tx-controls" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '8px' }}>
        <div className="tx-search-wrapper">
          <Search size={18} className="tx-search-icon" />
          <input
            type="text"
            className="form-input tx-search"
            placeholder="Cari nama, kategori, akun..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div className="tx-filters">
          <input
            type="month"
            className="form-input"
            value={filters.month}
            onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
          />
          <select
            className="form-select"
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          >
            <option value="">Semua Tipe</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
          <button 
            className="btn btn-outline btn-icon" 
            title="Filter Lanjutan"
            onClick={() => setFilterModalOpen(true)}
            style={{ position: 'relative' }}
          >
            <SlidersHorizontal size={18} />
            {(filters.categoryId || filters.accountId || filters.minAmount || filters.maxAmount || filters.tag) && (
              <span className="filter-active-dot" />
            )}
          </button>
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
                    {tx.is_split && <span title="Patungan (Split Bill)" style={{ marginLeft: 6, fontSize: '12px' }}>🍕</span>}
                  </span>
                  {tx.tags && tx.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px', marginBottom: '2px' }}>
                      {tx.tags.map((tag, i) => (
                        <span key={i} style={{ 
                          fontSize: '10px', 
                          padding: '1px 6px', 
                          borderRadius: '4px', 
                          background: 'var(--bg-main)', 
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-secondary)'
                        }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="tx-item-meta">
                    <span className="badge" style={{ background: (tx.categories?.color || '#6b7280') + '22', color: tx.categories?.color || 'var(--text-secondary)', fontSize: '11px' }}>
                      {CATEGORY_ICONS[tx.categories?.icon]} {tx.categories?.name}
                    </span>
                    · {tx.accounts?.name} · {formatDate(tx.date)}
                  </span>
                  {tx.is_split && tx.split_details?.length > 0 && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-main)', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border-default)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Detail Patungan:</div>
                      {tx.split_details.map((sd, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span>{sd.name}</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(sd.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="tx-item-right">
                  <span className={`tx-item-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.accounts?.currency)}
                  </span>
                  <div className="tx-item-actions">
                    <button className="btn btn-icon btn-ghost" onClick={() => { setEditTx(tx); setModalOpen(true); }} style={{ padding: '6px' }}>
                      <Edit2 size={20} />
                    </button>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-danger)', padding: '6px' }} onClick={() => handleDelete(tx.id)}>
                      <Trash2 size={20} />
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
        onClose={() => setModalOpen(false)}
        transaction={editTx}
        accounts={accounts}
        categories={categories}
        onSave={handleSave}
      />

      {/* Advanced Filter Modal */}
      {filterModalOpen && (
        <div className="modal-overlay" onClick={() => setFilterModalOpen(false)}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Filter Lanjutan</h2>
              <button className="modal-close" onClick={() => setFilterModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select 
                  className="form-select" 
                  value={filters.categoryId}
                  onChange={e => setFilters(f => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">Semua Kategori</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Akun Pembayaran</label>
                <select 
                  className="form-select" 
                  value={filters.accountId}
                  onChange={e => setFilters(f => ({ ...f, accountId: e.target.value }))}
                >
                  <option value="">Semua Akun</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tag / Label</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Misal: LiburanBali"
                  value={filters.tag || ''}
                  onChange={e => setFilters(f => ({ ...f, tag: e.target.value.trim().replace(/^#/, '') }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Minimal (Rp)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0"
                    value={filters.minAmount}
                    onChange={e => setFilters(f => ({ ...f, minAmount: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Maksimal (Rp)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Tak terhingga"
                    value={filters.maxAmount}
                    onChange={e => setFilters(f => ({ ...f, maxAmount: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setFilters(f => ({ ...f, categoryId: '', accountId: '', minAmount: '', maxAmount: '' }));
                  setFilterModalOpen(false);
                }}
              >
                Reset Filter
              </button>
              <button className="btn btn-primary" onClick={() => setFilterModalOpen(false)}>
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
