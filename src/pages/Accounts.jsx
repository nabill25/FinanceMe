import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Plus, Edit2, Trash2, Wallet, CreditCard, Smartphone, TrendingUp, RefreshCcw, ArrowLeftRight, X, ChevronRight } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDateShort, getCurrentMonth, ACCOUNT_TYPES, ACCOUNT_PROVIDERS, CURRENCIES } from '../lib/utils';
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
    <BottomSheet isOpen={open} onClose={onClose} title="Sinkronisasi Saldo">

        <div style={{ padding: '12px', background: 'var(--accent-soft)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
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

// ── WALLET ──────────────────────────────────────────────────
// Kartu ditumpuk seperti aplikasi dompet digital: tiap kartu memperlihatkan stripnya,
// kartu yang diketuk naik ke atas dan kartu lain menjadi "dek" tipis di belakangnya.

const CARD_SPRING = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };
const MAX_DECK_DEPTH = 3; // jumlah kartu yang masih terlihat di dek

/** Tanda penerbit di pojok kartu: logo asli bila tersedia, selain itu inisial/ikon. */
function CardMark({ account }) {
  const provider = ACCOUNT_PROVIDERS[account.type]?.find(p => p.id === account.icon);
  if (provider?.slug) return <ProviderLogo account={account} size={22} />;
  const Icon = ACCOUNT_ICONS[account.type] || Wallet;
  return (
    <span className="wallet-card-mark" aria-hidden="true">
      {provider ? provider.name.substring(0, 3).toUpperCase() : <Icon size={16} />}
    </span>
  );
}

function WalletCard({ account, mode, zIndex, onActivate }) {
  const Icon = ACCOUNT_ICONS[account.type] || Wallet;
  const isDeck = mode === 'deck' || mode === 'deck-hidden';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <motion.div
      layout="position"
      transition={CARD_SPRING}
      role="button"
      tabIndex={isDeck ? -1 : 0}
      aria-expanded={mode === 'selected'}
      aria-label={mode === 'selected'
        ? `Tutup kartu ${account.name}`
        : `${account.name}, saldo ${formatCurrency(account.balance, account.currency || 'IDR')}`}
      className={`wallet-card is-${mode}`}
      style={{ '--acc-color': account.color || '#6366f1', zIndex }}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    >
      <div className="wallet-card-strip">
        <CardMark account={account} />
        <span className="wallet-card-name">{account.name}</span>
        <span className="wallet-card-balance account-card-balance">
          {formatCurrency(account.balance, account.currency || 'IDR')}
        </span>
      </div>
      <div className="wallet-card-body" aria-hidden="true">
        {account.type === 'bank'
          ? <span className="wallet-card-chip" />
          : <Icon size={22} className="wallet-card-glyph" />}
      </div>
      <div className="wallet-card-footer" aria-hidden="true">
        <span>{ACCOUNT_TYPES[account.type]?.label}</span>
        <span>{account.currency || 'IDR'}</span>
      </div>
    </motion.div>
  );
}

function WalletDetail({ account, transactions, onClose, onSync, onEdit, onDelete }) {
  const currency = account.currency || 'IDR';
  const recentTx = transactions.filter(tx => tx.account_id === account.id).slice(0, 5);

  return (
    <div className="wallet-detail card">
      <div className="wallet-detail-head">
        <div style={{ minWidth: 0 }}>
          <p className="wallet-detail-label">Saldo {account.name}</p>
          <p className="wallet-detail-balance amount-text">{formatCurrency(account.balance, currency)}</p>
          <p className="wallet-detail-meta">{ACCOUNT_TYPES[account.type]?.label} · {currency}</p>
        </div>
        <button className="btn btn-icon btn-ghost" onClick={onClose} title="Tutup kartu" aria-label="Tutup kartu">
          <X size={18} />
        </button>
      </div>

      <div className="wallet-detail-actions">
        <button className="btn btn-outline btn-sm" onClick={onSync}>
          <RefreshCcw size={14} /> Sesuaikan
        </button>
        <button className="btn btn-outline btn-sm" onClick={onEdit}>
          <Edit2 size={14} /> Edit
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          <Trash2 size={14} /> Hapus
        </button>
      </div>

      <div className="wallet-tx">
        <div className="wallet-tx-title">
          <span>Transaksi bulan ini</span>
          <Link to="/transactions" className="wallet-tx-link">
            Semua <ChevronRight size={14} />
          </Link>
        </div>
        {recentTx.length === 0 ? (
          <p className="wallet-tx-empty">Belum ada transaksi bulan ini di akun ini.</p>
        ) : (
          recentTx.map(tx => (
            <div key={tx.id} className="wallet-tx-row">
              <div style={{ minWidth: 0 }}>
                <div className="wallet-tx-desc">{tx.description || tx.categories?.name || 'Transaksi'}</div>
                <div className="wallet-tx-date">{formatDateShort(tx.date)}</div>
              </div>
              <span className={`wallet-tx-amount amount-text ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    accounts, fetchAccounts, addAccount, updateAccount, deleteAccount,
    categories, fetchCategories, addTransaction, transactions, fetchTransactions
  } = useFinanceStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const walletRef = useRef(null);

  // Kalau akun yang dipilih dihapus, otomatis kembali ke tampilan tumpukan
  const selectedAccount = accounts.find(a => a.id === selectedId) || null;

  useEffect(() => {
    if (user) {
      fetchAccounts(user.id);
      fetchCategories(user.id);
      fetchTransactions(user.id, { month: getCurrentMonth() });
    }
  }, [user]);

  useEffect(() => {
    // Dari Dashboard: langsung buka kartu akun yang diketuk
    if (location.state?.openAccountId && accounts.length > 0) {
      if (accounts.some(a => a.id === location.state.openAccountId)) {
        setSelectedId(location.state.openAccountId);
        // Clear state so it doesn't reopen on refresh
        navigate('/accounts', { replace: true, state: {} });
      }
    }
  }, [location.state, accounts, navigate]);

  // Esc menutup kartu yang sedang dibuka
  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  const toggleCard = (id) => {
    setSelectedId(current => (current === id ? null : id));
    // Pastikan kartu yang dibuka terlihat bila tumpukannya panjang
    const top = walletRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) {
      walletRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
    toast.success('Saldo berhasil disesuaikan');
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

  // Saat satu kartu dibuka, kartu itu tampil paling depan dan sisanya menjadi dek di belakangnya
  const orderedAccounts = selectedAccount
    ? [selectedAccount, ...accounts.filter(a => a.id !== selectedAccount.id)]
    : accounts;

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
        <MotionConfig reducedMotion="user">
          <div className={`wallet ${selectedAccount ? 'has-selection' : ''}`} ref={walletRef}>
            <div className="wallet-cards">
              {orderedAccounts.map((acc, index) => {
                let mode = 'stack';
                let zIndex = index + 1; // di tumpukan, kartu berikutnya berada di depan
                if (selectedAccount) {
                  const depth = index; // 0 = kartu yang dibuka
                  mode = depth === 0 ? 'selected' : depth <= MAX_DECK_DEPTH ? 'deck' : 'deck-hidden';
                  zIndex = depth === 0 ? accounts.length + 1 : accounts.length - depth;
                }
                return (
                  <WalletCard
                    key={acc.id}
                    account={acc}
                    mode={mode}
                    zIndex={zIndex}
                    onActivate={() => (mode === 'stack' ? toggleCard(acc.id) : setSelectedId(null))}
                  />
                );
              })}
            </div>

            <motion.div layout="position" transition={CARD_SPRING} className="wallet-side">
              <AnimatePresence mode="wait" initial={false}>
                {selectedAccount ? (
                  <motion.div
                    key={selectedAccount.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <WalletDetail
                      account={selectedAccount}
                      transactions={transactions}
                      onClose={() => setSelectedId(null)}
                      onSync={() => { setEditAccount(selectedAccount); setSyncModalOpen(true); }}
                      onEdit={() => { setEditAccount(selectedAccount); setModalOpen(true); }}
                      onDelete={() => handleDelete(selectedAccount.id)}
                    />
                  </motion.div>
                ) : (
                  <motion.p
                    key="hint"
                    className="wallet-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    Ketuk kartu untuk melihat saldo, aksi, dan transaksi bulan ini.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </MotionConfig>
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
