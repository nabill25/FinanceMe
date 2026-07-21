import { useState, useEffect, useRef } from 'react';
import { Plus, Camera, Loader2, ShieldAlert, Shield, ImagePlus, ArrowLeftRight } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { scanReceipt, guessCategory } from '../lib/gemini';
import { getCurrentMonth, formatCurrency } from '../lib/utils';
import { useLocation } from 'react-router-dom';
import TransferModal from './TransferModal';
import TagInput from './TagInput';
import './QuickAddModal.css';

export default function QuickAddModal() {
  const { user } = useAuthStore();
  const { addTransaction, accounts, categories, spendingLimit, spendingGuardState, budgets, getCategorySpending, uploadReceipt } = useFinanceStore();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [guessingCategory, setGuessingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const [form, setForm] = useState({ 
    type: 'expense', amount: '', description: '', account_id: '', category_id: '', date: new Date().toISOString().split('T')[0], tags: []
  });

  useEffect(() => {
    if (open) {
      if (accounts.length > 0 && !form.account_id) {
        setForm(f => ({ ...f, account_id: accounts[0].id }));
      }
    }
  }, [open, accounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.account_id) return;
    
    setSaving(true);
    try {
      let finalForm = {
        ...form,
        user_id: user.id,
        amount: Number(form.amount)
      };
      
      if (receiptFile) {
        const url = await uploadReceipt(receiptFile);
        if (url) finalForm.receipt_url = url;
      }
      
      await addTransaction(finalForm);
      toast.success('Transaksi berhasil dicatat!');
      setOpen(false);
      setForm({ ...form, amount: '', description: '' });
      setReceiptFile(null);
      setReceiptPreview(null);
    } catch (err) {
      toast.error(err.message || 'Gagal mencatat transaksi');
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
            toast.success(`Struk diproses! Ada ${result.items.length} rincian barang. Buka via menu Transaksi jika ingin rincian otomatis disimpan.`);
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
    
    setGuessingCategory(true);
    try {
      const guessedId = await guessCategory(form.description, form.type, categories);
      if (guessedId) {
        setForm(f => ({ ...f, category_id: guessedId }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGuessingCategory(false);
    }
  };

  const handleDescriptionBlur = () => {
    if (form.description && !form.category_id) {
      handleGuessCategory();
    }
  };

  const filteredCategories = categories.filter(c => c.type === form.type);

  // Budget Check
  let budgetWarning = null;
  if (form.type === 'expense' && form.category_id && form.amount) {
    const budget = budgets.find(b => b.category_id === form.category_id);
    if (budget) {
      const monthStr = getCurrentMonth();
      const spent = getCategorySpending(monthStr).find(c => c.category_id === form.category_id)?.total || 0;
      const newTotal = spent + Number(form.amount);
      if (newTotal > budget.amount) {
        budgetWarning = { spent, newTotal, limit: budget.amount };
      }
    }
  }

  // Sembunyikan FAB di rute tertentu yang tidak membutuhkan tambah transaksi cepat
  const hiddenRoutes = ['/advisor', '/decision', '/settings', '/reports', '/forecast'];
  const showFab = !hiddenRoutes.includes(location.pathname);

  return (
    <>
      {showFab && (
        <div className="quick-add-fab-group">
          {accounts.length >= 2 && (
            <button
              className="quick-add-fab-secondary"
              onClick={() => setTransferOpen(true)}
              title="Transfer Antar Akun"
            >
              <ArrowLeftRight size={18} />
            </button>
          )}
          <button className="quick-add-fab" onClick={() => setOpen(true)}>
            <Plus size={24} />
          </button>
        </div>
      )}

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Transaksi Cepat</h3>
              <button className="btn-icon btn-ghost" onClick={() => setOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body quick-add-form">
              <div className="type-toggle">
                <button type="button" 
                  className={`type-btn ${form.type === 'expense' ? 'active expense' : ''}`}
                  onClick={() => setForm({...form, type: 'expense', category_id: ''})}>Pengeluaran</button>
                <button type="button" 
                  className={`type-btn ${form.type === 'income' ? 'active income' : ''}`}
                  onClick={() => setForm({...form, type: 'income', category_id: ''})}>Pemasukan</button>
              </div>

              {/* Spending Guard Banner */}
              {form.type === 'expense' && spendingLimit?.is_active && spendingGuardState && (
                spendingGuardState.blocked ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginTop: '8px' }}>
                    <ShieldAlert size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <p style={{ fontSize: '11px', color: '#ef4444', margin: 0 }}>
                      🚫 Diblokir hingga: <strong style={{ fontFamily: 'monospace' }}>{new Date(spendingGuardState.unblock_at).toLocaleString('id-ID')}</strong>
                    </p>
                  </div>
                ) : spendingGuardState.pct >= 80 ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', marginTop: '8px' }}>
                    <Shield size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '11px', color: '#b45309' }}>
                      ⚠️ Terpakai <strong>{Math.round(spendingGuardState.pct)}%</strong> limit
                    </p>
                  </div>
                ) : null
              )}

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Nominal (Rp)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input required type="number" min="1" className="form-input amount-input" 
                    value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} 
                    placeholder="0" autoFocus style={{ flex: 1 }} />
                  <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current?.click()} disabled={scanning} style={{ padding: '0 12px' }} title="Pilih Bukti (Foto/Galeri)">
                    {scanning ? <Loader2 size={20} className="spin" /> : <ImagePlus size={20} />}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleScan} accept="image/*" style={{ display: 'none' }} />
                </div>
                {/* Receipt Preview */}
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
                      <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null); setForm(f => ({ ...f, receipt_url: null })); }} className="btn-icon btn-ghost" style={{ position: 'absolute', top: 4, right: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', width: 24, height: 24, minWidth: 24, padding: 0 }}>✕</button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Keterangan / Deskripsi</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" className="form-input" value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                    onBlur={handleDescriptionBlur}
                    placeholder="Contoh: Makan siang" 
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
                <label className="form-label">Akun</label>
                <select required className="form-select" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}>
                  <option value="" disabled>Pilih Akun</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Kategori</label>
                  {guessingCategory && <span style={{ fontSize: '11px', color: 'var(--accent-primary)' }} className="animate-pulse">✨ AI berpikir...</span>}
                </div>
                <div className="category-chips">
                  {filteredCategories.map(c => (
                    <button key={c.id} type="button" 
                      className={`cat-chip ${form.category_id === c.id ? 'active' : ''}`}
                      onClick={() => setForm({...form, category_id: c.id})}
                      style={{ '--chip-color': c.color }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tag / Label</label>
                <TagInput tags={form.tags} onChange={tags => setForm({ ...form, tags })} />
              </div>
              
              {budgetWarning && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <ShieldAlert size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '11px', color: '#b91c1c' }}>
                    ⚠️ <strong>Over Budget!</strong> Transaksi ini akan membuat kategori melebihi batas {formatCurrency(budgetWarning.limit)}.
                  </p>
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: '12px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <TransferModal isOpen={transferOpen} onClose={() => setTransferOpen(false)} />
    </>
  );
}
