import { useState } from 'react';
import { ArrowRight, ArrowLeftRight, X, Loader2, Info } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import './TransferModal.css';

export default function TransferModal({ isOpen, onClose }) {
  const { user } = useAuthStore();
  const { accounts, addTransfer } = useFinanceStore();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
  });

  const fromAccount = accounts.find(a => a.id === form.fromAccountId);
  const toAccount = accounts.find(a => a.id === form.toAccountId);
  const amountNum = Number(form.amount) || 0;
  const insufficient = fromAccount && amountNum > 0 && amountNum > fromAccount.balance;

  const handleSwap = () => {
    setForm(f => ({
      ...f,
      fromAccountId: f.toAccountId,
      toAccountId: f.fromAccountId,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromAccountId || !form.toAccountId || !form.amount) return;
    if (form.fromAccountId === form.toAccountId) {
      toast.error('Akun asal dan tujuan tidak boleh sama!');
      return;
    }
    setLoading(true);
    try {
      await addTransfer({
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        amount: Number(form.amount),
        note: form.note,
        date: form.date,
        userId: user.id,
      });
      toast.success(`Transfer ${formatCurrency(Number(form.amount))} berhasil! ↔️`);
      onClose();
      setForm({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        note: '',
        date: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      toast.error(err.message || 'Gagal melakukan transfer');
    } finally {
      setLoading(false);
    }
  };

  // Removed if (!isOpen) return null; because BottomSheet handles it

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Transfer Antar Akun">
      <div className="transfer-modal">
        {/* Header content moved to subtitle since BottomSheet handles title */}
        <div style={{ marginBottom: 16 }}>
          <p className="transfer-subtitle" style={{ marginTop: 0 }}>Pindah saldo tanpa keluar masuk manual</p>
        </div>

        <form onSubmit={handleSubmit} className="transfer-body">
          {/* Account selector */}
          <div className="transfer-accounts">
            {/* From */}
            <div className="transfer-account-box">
              <label className="transfer-account-label">Dari Akun</label>
              <select
                className="transfer-select"
                value={form.fromAccountId}
                onChange={e => setForm(f => ({ ...f, fromAccountId: e.target.value }))}
                required
              >
                <option value="">Pilih akun...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id} disabled={a.id === form.toAccountId}>
                    {a.name}
                  </option>
                ))}
              </select>
              {fromAccount && (
                <div className={`transfer-account-balance ${insufficient ? 'insufficient' : ''}`}>
                  {insufficient
                    ? `❌ Saldo tidak cukup (${formatCurrency(fromAccount.balance)})`
                    : `💰 Saldo: ${formatCurrency(fromAccount.balance)}`
                  }
                </div>
              )}
            </div>

            {/* Swap button */}
            <button
              type="button"
              className="transfer-swap-btn"
              onClick={handleSwap}
              title="Tukar asal & tujuan"
            >
              <ArrowLeftRight size={16} />
            </button>

            {/* To */}
            <div className="transfer-account-box">
              <label className="transfer-account-label">Ke Akun</label>
              <select
                className="transfer-select"
                value={form.toAccountId}
                onChange={e => setForm(f => ({ ...f, toAccountId: e.target.value }))}
                required
              >
                <option value="">Pilih akun...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id} disabled={a.id === form.fromAccountId}>
                    {a.name}
                  </option>
                ))}
              </select>
              {toAccount && (
                <div className="transfer-account-balance">
                  💰 Saldo: {formatCurrency(toAccount.balance)}
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="transfer-field">
            <label className="transfer-label">Jumlah Transfer</label>
            <div className="transfer-amount-wrap">
              <span className="transfer-currency">Rp</span>
              <input
                type="number"
                className={`transfer-amount-input ${insufficient ? 'input-error' : ''}`}
                placeholder="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                min="1"
                required
              />
            </div>
          </div>

          {/* Preview */}
          {fromAccount && toAccount && amountNum > 0 && !insufficient && (
            <div className="transfer-preview">
              <Info size={14} />
              <span>
                <strong>{fromAccount.name}</strong> <ArrowRight size={12} /> <strong>{toAccount.name}</strong> sebesar <strong>{formatCurrency(amountNum)}</strong>
              </span>
            </div>
          )}

          {/* Note */}
          <div className="transfer-field">
            <label className="transfer-label">Catatan (opsional)</label>
            <input
              type="text"
              className="transfer-input"
              placeholder="Contoh: Dana darurat"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>

          {/* Date */}
          <div className="transfer-field">
            <label className="transfer-label">Tanggal Transfer</label>
            <input
              type="date"
              className="transfer-input"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
            />
          </div>

          {/* Actions */}
          <div className="transfer-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || insufficient || !form.fromAccountId || !form.toAccountId || !form.amount}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <ArrowLeftRight size={16} />}
              {loading ? 'Memproses...' : 'Kirim Transfer'}
            </button>
          </div>
        </form>
      </div>
    </BottomSheet>
  );
}
