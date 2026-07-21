import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Wallet, CreditCard, Smartphone, TrendingUp, RefreshCcw, ArrowLeftRight, MoreVertical } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, ACCOUNT_TYPES, ACCOUNT_PROVIDERS, CURRENCIES } from '../lib/utils';
import ProviderLogo from '../components/ProviderLogo';
import { toast } from 'sonner';
import TransferModal from '../components/TransferModal';
import BottomSheet from '../components/BottomSheet';
import './Accounts.css';

const COLORS = [
  '#6366f1', '#8b5cf6', '#10b981', '#06b6d4', '#f59e0b',
  '#ef4444', '#ec4899', '#f97316', '#3b82f6', '#14b8a6',
];

const ACCOUNT_ICONS = {
  cash: Wallet,
  bank: CreditCard,
  ewallet: Smartphone,
  investment: TrendingUp,
};

const defaultForm = {
  name: '', type: 'bank', balance: '', color: COLORS[0], icon: 'bca', currency: 'IDR'
};

function AccountModal({ open, onClose, account, onSave }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setForm({ name: account.name, type: account.type, balance: account.balance, color: account.color, icon: account.icon || account.type, currency: account.currency || 'IDR' });
    } else {
      setForm(defaultForm);
    }
  }, [account, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || form.balance === '') return;
    setSaving(true);
    try {
      await onSave({ ...form, balance: Number(form.balance) });
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={open} onClose={onClose} title={account ? 'Edit Akun' : 'Tambah Akun'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Nama Akun</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="BCA, GoPay, Dompet, dll." required />
          </div>
          <div className="form-group">
            <label className="form-label">Jenis Akun</label>
            <select className="form-select" value={form.type} onChange={e => {
              const type = e.target.value;
              const provider = ACCOUNT_PROVIDERS[type]?.[0];
              setForm(f => ({ 
                ...f, 
                type, 
                icon: provider ? provider.id : type,
                name: provider ? provider.name : '',
                color: provider ? provider.color : f.color
              }));
            }}>
              {Object.entries(ACCOUNT_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {(form.type === 'bank' || form.type === 'ewallet') && (
            <div className="form-group">
              <label className="form-label">Penyedia (Provider)</label>
              <select className="form-select" value={form.icon} onChange={e => {
                const provider = ACCOUNT_PROVIDERS[form.type]?.find(p => p.id === e.target.value);
                setForm(f => ({
                  ...f,
                  icon: e.target.value,
                  name: provider && !f.name ? provider.name : (provider ? provider.name : f.name),
                  color: provider ? provider.color : f.color
                }));
              }}>
                {ACCOUNT_PROVIDERS[form.type]?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Mata Uang</label>
            <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{account ? 'Saldo Saat Ini' : 'Saldo Awal'}</label>
            <input className="form-input" type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="0" required min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Warna</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} type="button" className={`color-option ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
              ))}
            </div>
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none', margin: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : (account ? 'Simpan' : 'Tambah Akun')}
            </button>
          </div>
        </form>
    </BottomSheet>
  );
}

function SyncModal({ open, onClose, account, onSave }) {
  const [actualBalance, setActualBalance] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && account) {
      setActualBalance(account.balance.toString());
    }
  }, [open, account]);

  if (!open || !account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const actual = Number(actualBalance);
    if (isNaN(actual)) return;
    
    setSaving(true);
    try {
      const diff = actual - account.balance;
      if (diff !== 0) {
        await onSave(account.id, diff);
      } else {
        toast.info('Saldo sudah sesuai.');
      }
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const diff = Number(actualBalance) - account.balance;

  return (
    <BottomSheet isOpen={open} onClose={onClose} title="🔄 Sinkronisasi Saldo">
        
        <div style={{ padding: '12px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          Masukkan saldo riil yang ada di aplikasi m-banking atau e-wallet Anda. Sistem akan otomatis membuat transaksi penyesuaian agar saldo cocok.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Saldo Saat Ini (di sistem)</label>
            <input className="form-input" type="text" value={formatCurrency(account.balance)} disabled />
          </div>
          
          <div className="form-group">
            <label className="form-label">Saldo Sebenarnya (di {account.name})</label>
            <input className="form-input" type="number" value={actualBalance} onChange={e => setActualBalance(e.target.value)} required min="0" autoFocus />
          </div>

          {!isNaN(diff) && diff !== 0 && (
            <div style={{ fontSize: '13px', color: diff > 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              Sistem akan mencatat <strong>{diff > 0 ? 'Pemasukan' : 'Pengeluaran'}</strong> sebesar {formatCurrency(Math.abs(diff))} untuk penyesuaian.
            </div>
          )}

          <div className="modal-footer" style={{ padding: 0, border: 'none', margin: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving || isNaN(diff) || diff === 0}>
              {saving ? <span className="spinner" /> : 'Sesuaikan Saldo'}
            </button>
          </div>
        </form>
    </BottomSheet>
  );
}

function TiltCard({ children, accColor }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (-10deg to +10deg max)
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    cardRef.current.style.transition = 'none';
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    cardRef.current.style.transition = 'transform 0.5s ease-out';
  };

  return (
    <div 
      className="account-card card tiltable-card" 
      ref={cardRef}
      style={{ '--acc-color': accColor }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

export default function AccountsPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { accounts, fetchAccounts, addAccount, updateAccount, deleteAccount, categories, fetchCategories, addTransaction } = useFinanceStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Close dropdown when clicking anywhere
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      fetchAccounts(user.id);
      fetchCategories(user.id);
    }
  }, [user]);

  useEffect(() => {
    // Auto-open modal if navigating from Dashboard
    if (location.state?.openAccountId && accounts.length > 0) {
      const acc = accounts.find(a => a.id === location.state.openAccountId);
      if (acc) {
        setEditAccount(acc);
        setModalOpen(true);
        // Clear state so it doesn't reopen on refresh
        navigate('/accounts', { replace: true, state: {} });
      }
    }
  }, [location.state, accounts, navigate]);

  const handleSync = async (accountId, diffAmount) => {
    const type = diffAmount > 0 ? 'income' : 'expense';
    
    // Cari kategori "Lainnya" sesuai tipe, jika tidak ada pakai kategori pertama yang cocok
    let category = categories.find(c => c.type === type && c.name.toLowerCase().includes('lainnya'));
    if (!category) {
      category = categories.find(c => c.type === type);
    }

    if (!category) {
      throw new Error(`Tidak ditemukan kategori untuk transaksi penyesuaian (${type}).`);
    }

    const tx = {
      type,
      amount: Math.abs(diffAmount),
      description: 'Penyesuaian Saldo (Sinkronisasi)',
      date: new Date().toISOString().split('T')[0],
      account_id: accountId,
      category_id: category.id,
      user_id: user.id
    };

    await addTransaction(tx);
    toast.success('Saldo berhasil disesuaikan!');
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const handleSave = async (form) => {
    if (editAccount) {
      await updateAccount(editAccount.id, form);
      toast.success('Akun berhasil diperbarui');
    } else {
      await addAccount({ ...form, user_id: user.id });
      toast.success('Akun berhasil ditambahkan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus akun ini? Semua transaksi terkait akan tetap ada.')) return;
    try {
      await deleteAccount(id);
      toast.success('Akun dihapus');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="accounts-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Akun Saya</h1>
          <p className="text-secondary text-sm">Kelola semua akun keuangan Anda</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {accounts.length >= 2 && (
            <button className="btn btn-outline" onClick={() => setTransferModalOpen(true)}>
              <ArrowLeftRight size={16} /> Transfer
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { setEditAccount(null); setModalOpen(true); }}>
            <Plus size={16} /> Tambah Akun
          </button>
        </div>
      </div>

      {/* Total balance */}
      <div className="accounts-total card">
        <p className="text-sm text-muted">Total Saldo</p>
        <h2 className="accounts-total-amount">{formatCurrency(totalBalance)}</h2>
        <p className="text-sm text-secondary">{accounts.length} akun terdaftar</p>
      </div>

      {accounts.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">💳</span>
          <h3>Belum ada akun</h3>
          <p>Tambahkan akun bank, e-wallet, atau tunai Anda</p>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Tambah Akun Pertama
          </button>
        </div>
      ) : (
        <div className="accounts-grid">
          {accounts.map((acc) => {
            const provider = ACCOUNT_PROVIDERS[acc.type]?.find(p => p.id === acc.icon);
            const Icon = ACCOUNT_ICONS[acc.type] || Wallet;
            return (
              <TiltCard key={acc.id} accColor={acc.color}>
                <div className="account-card-top">
                  <ProviderLogo account={acc} size={36} />
                  <div className="account-card-actions" style={{ gap: '8px', position: 'relative' }}>
                    <button 
                      className="btn btn-icon btn-ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === acc.id ? null : acc.id);
                      }} 
                      style={{ color: 'white' }}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeDropdown === acc.id && (
                      <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                        <button className="dropdown-item" onClick={() => { setEditAccount(acc); setSyncModalOpen(true); setActiveDropdown(null); }}>
                          <RefreshCcw size={16} /> Sesuaikan Saldo
                        </button>
                        <button className="dropdown-item" onClick={() => { setEditAccount(acc); setModalOpen(true); setActiveDropdown(null); }}>
                          <Edit2 size={16} /> Edit Akun
                        </button>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item text-danger" onClick={() => { handleDelete(acc.id); setActiveDropdown(null); }}>
                          <Trash2 size={16} /> Hapus Akun
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="account-card-name">{acc.name}</div>
                <div className="account-card-type">{ACCOUNT_TYPES[acc.type]?.label}</div>
                <div className="account-card-balance">{formatCurrency(acc.balance)}</div>
                <div className="account-card-bar" style={{ background: acc.color + '33' }}>
                  <div className="account-card-bar-fill" style={{ background: acc.color }} />
                </div>
              </TiltCard>
            );
          })}
        </div>
      )}

      <AccountModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditAccount(null); }}
        account={editAccount}
        onSave={handleSave}
      />
      <SyncModal
        open={syncModalOpen}
        onClose={() => { setSyncModalOpen(false); setEditAccount(null); }}
        account={editAccount}
        onSave={handleSync}
      />
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
      />
    </div>
  );
}
