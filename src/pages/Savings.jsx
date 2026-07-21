import { useState, useEffect } from 'react';
import { Plus, PiggyBank, ArrowDown, ArrowUp, Trash2, Edit2 } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, clamp } from '../lib/utils';
import { toast } from 'sonner';
import BottomSheet from '../components/BottomSheet';
import './Savings.css';

const POT_ICONS = ['🐷', '🏖️', '🚗', '🏠', '✈️', '🎓', '💊', '💍', '📱', '🎮', '🌍', '🎁'];
const COLORS = [
  '#6366f1', '#8b5cf6', '#10b981', '#06b6d4', '#f59e0b',
  '#ef4444', '#ec4899', '#f97316', '#3b82f6', '#14b8a6',
];

function PotModal({ open, onClose, pot, onSave }) {
  const [form, setForm] = useState({ name: '', target_amount: '', color: COLORS[0], icon: '🐷' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pot) {
      setForm({ name: pot.name, target_amount: pot.target_amount, color: pot.color, icon: pot.icon });
    } else {
      setForm({ name: '', target_amount: '', color: COLORS[0], icon: '🐷' });
    }
  }, [pot, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, target_amount: Number(form.target_amount) });
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={open} onClose={onClose} title={pot ? 'Edit Celengan' : 'Celengan Baru'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Nama Celengan</label>
            <input className="form-input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Dana Darurat, Liburan, dll." required />
          </div>
          <div className="form-group">
            <label className="form-label">Target Nominal (Rp)</label>
            <input className="form-input" type="number" min="1" value={form.target_amount}
              onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
              placeholder="0" required />
          </div>
          <div className="form-group">
            <label className="form-label">Ikon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {POT_ICONS.map(ic => (
                <button key={ic} type="button"
                  style={{
                    fontSize: '22px', padding: '6px', borderRadius: '8px', border: '2px solid',
                    borderColor: form.icon === ic ? form.color : 'transparent',
                    background: form.icon === ic ? form.color + '22' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setForm(f => ({ ...f, icon: ic }))}>
                  {ic}
                </button>
              ))}
            </div>
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
              {saving ? <span className="spinner" /> : (pot ? 'Simpan' : 'Buat Celengan')}
            </button>
          </div>
        </form>
    </BottomSheet>
  );
}

function TransferModal({ open, onClose, pot, type }) {
  const { topUpSavingsPot, withdrawSavingsPot, accounts } = useFinanceStore();
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setAccountId(accounts[0]?.id || '');
    }
  }, [open, accounts]);

  if (!open || !pot) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !accountId) return;
    setLoading(true);
    try {
      if (type === 'topup') {
        await topUpSavingsPot(pot.id, Number(amount), accountId);
        toast.success(`Rp ${Number(amount).toLocaleString('id-ID')} berhasil ditabung!`);
      } else {
        await withdrawSavingsPot(pot.id, Number(amount), accountId);
        toast.success(`Rp ${Number(amount).toLocaleString('id-ID')} berhasil ditarik!`);
      }
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={open} onClose={onClose} title={type === 'topup' ? `💰 Setor ke ${pot.name}` : `📤 Tarik dari ${pot.name}`}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Akun {type === 'topup' ? 'Sumber' : 'Tujuan'}</label>
            <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)} required>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nominal (Rp)</label>
            <input className="form-input" type="number" min="1" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0" required autoFocus />
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none', margin: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (type === 'topup' ? 'Setor' : 'Tarik')}
            </button>
          </div>
        </form>
    </BottomSheet>
  );
}

export default function SavingsPage() {
  const { user } = useAuthStore();
  const { savingsPots, fetchSavingsPots, addSavingsPot, updateSavingsPot, deleteSavingsPot } = useFinanceStore();
  const [potModal, setPotModal] = useState({ open: false, pot: null });
  const [transferModal, setTransferModal] = useState({ open: false, pot: null, type: 'topup' });

  useEffect(() => {
    if (user) fetchSavingsPots(user.id);
  }, [user]);

  const handleSavePot = async (form) => {
    if (potModal.pot) {
      await updateSavingsPot(potModal.pot.id, form);
      toast.success('Celengan diperbarui!');
    } else {
      await addSavingsPot({ ...form, user_id: user.id, current_amount: 0 });
      toast.success('Celengan baru berhasil dibuat!');
    }
    setPotModal({ open: false, pot: null });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus celengan ini? Saldo celengan tidak akan dikembalikan ke akun.')) return;
    try {
      await deleteSavingsPot(id);
      toast.success('Celengan dihapus');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const totalSaved = savingsPots.reduce((s, p) => s + p.current_amount, 0);
  const totalTarget = savingsPots.reduce((s, p) => s + p.target_amount, 0);

  return (
    <div className="savings-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>💰 Tabungan</h1>
          <p className="text-secondary text-sm">Celengan virtual untuk setiap tujuan</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPotModal({ open: true, pot: null })}>
          <Plus size={16} /> Celengan Baru
        </button>
      </div>

      {/* Summary */}
      <div className="savings-summary card">
        <div className="savings-summary-item">
          <PiggyBank size={28} style={{ color: '#6366f1' }} />
          <div>
            <p className="text-xs text-muted">Total Terkumpul</p>
            <p className="savings-summary-amount" style={{ color: '#6366f1' }}>{formatCurrency(totalSaved)}</p>
          </div>
        </div>
        <div className="savings-summary-divider" />
        <div className="savings-summary-item">
          <div>
            <p className="text-xs text-muted">Total Target</p>
            <p className="savings-summary-amount">{formatCurrency(totalTarget)}</p>
          </div>
        </div>
        <div className="savings-summary-divider" />
        <div className="savings-summary-item">
          <div>
            <p className="text-xs text-muted">Progress Keseluruhan</p>
            <p className="savings-summary-amount" style={{ color: '#10b981' }}>
              {totalTarget > 0 ? `${Math.round((totalSaved / totalTarget) * 100)}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      {savingsPots.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">🐷</span>
          <h3>Belum ada celengan</h3>
          <p>Buat celengan untuk Dana Darurat, Liburan, atau tujuan lainnya!</p>
          <button className="btn btn-primary" onClick={() => setPotModal({ open: true, pot: null })}>
            <Plus size={16} /> Buat Celengan Pertama
          </button>
        </div>
      ) : (
        <div className="savings-grid">
          {savingsPots.map(pot => {
            const pct = pot.target_amount > 0
              ? clamp((pot.current_amount / pot.target_amount) * 100, 0, 100)
              : 0;
            return (
              <div key={pot.id} className="pot-card card" style={{ '--pot-color': pot.color }}>
                <div className="pot-card-top">
                  <div className="pot-icon" style={{ background: pot.color + '22' }}>
                    <span style={{ fontSize: '28px' }}>{pot.icon}</span>
                  </div>
                  <div className="pot-actions">
                    <button className="btn btn-icon btn-ghost" onClick={() => setPotModal({ open: true, pot })} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-danger)' }}
                      onClick={() => handleDelete(pot.id)} title="Hapus">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="pot-name">{pot.name}</h3>
                <div className="pot-amounts">
                  <span className="pot-current" style={{ color: pot.color }}>{formatCurrency(pot.current_amount)}</span>
                  <span className="pot-target text-muted"> / {formatCurrency(pot.target_amount)}</span>
                </div>
                <div className="progress-bar-container" style={{ marginTop: '8px', marginBottom: '12px' }}>
                  <div className="progress-bar" style={{ width: `${pct}%`, background: pot.color }} />
                </div>
                <p className="pot-pct text-xs text-muted">{Math.round(pct)}% tercapai</p>
                <div className="pot-card-actions">
                  <button className="btn btn-sm" style={{ background: pot.color + '22', color: pot.color, flex: 1 }}
                    onClick={() => setTransferModal({ open: true, pot, type: 'topup' })}>
                    <ArrowDown size={14} /> Setor
                  </button>
                  <button className="btn btn-sm btn-ghost" style={{ flex: 1 }}
                    onClick={() => setTransferModal({ open: true, pot, type: 'withdraw' })}>
                    <ArrowUp size={14} /> Tarik
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PotModal
        open={potModal.open}
        onClose={() => setPotModal({ open: false, pot: null })}
        pot={potModal.pot}
        onSave={handleSavePot}
      />
      <TransferModal
        open={transferModal.open}
        onClose={() => setTransferModal({ open: false, pot: null, type: 'topup' })}
        pot={transferModal.pot}
        type={transferModal.type}
      />
    </div>
  );
}
