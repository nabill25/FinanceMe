import { useEffect, useState } from 'react';
import { Target, Plus, Edit2, Trash2, CheckCircle, TrendingUp } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../lib/utils';
import './Goals.css';

const PRESET_ICONS = ['target', 'home', 'car', 'plane', 'graduation-cap', 'heart'];
const PRESET_COLORS = ['#0ea5e9', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#6366f1'];

export default function GoalsPage() {
  const { user } = useAuthStore();
  const { goals, fetchGoals, addGoal, updateGoal, deleteGoal, accounts, fetchAccounts } = useFinanceStore();
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', target_amount: '', current_amount: '0', deadline: '', icon: 'target', color: '#0ea5e9'
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchGoals(user.id);
      fetchAccounts(user.id);
    }
  }, [user]);

  const openAdd = () => {
    setForm({ name: '', target_amount: '', current_amount: '0', deadline: '', icon: 'target', color: '#0ea5e9' });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (g) => {
    setForm({ ...g });
    setEditingId(g.id);
    setShowForm(true);
  };

  const saveGoal = async (e) => {
    e.preventDefault();
    if (!form.name || !form.target_amount) return;

    try {
      const payload = {
        user_id: user.id,
        name: form.name,
        target_amount: Number(form.target_amount),
        current_amount: Number(form.current_amount) || 0,
        deadline: form.deadline || null,
        icon: form.icon,
        color: form.color,
      };

      if (editingId) await updateGoal(editingId, payload);
      else await addGoal(payload);

      setShowForm(false);
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan target: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus target ini?')) {
      await deleteGoal(id);
    }
  };

  return (
    <div className="goals-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Target Tabungan</h1>
          <p className="text-secondary text-sm">Wujudkan impian finansial Anda satu per satu</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={18} /> Tambah Target
        </button>
      </div>

      <div className="goals-grid">
        {goals.map(g => {
          const progress = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
          const isCompleted = progress >= 100;
          
          return (
            <div key={g.id} className="card goal-card">
              <div className="goal-card-header">
                <div className="goal-icon" style={{ background: `${g.color}20`, color: g.color }}>
                  <Target size={24} />
                </div>
                <div className="goal-actions">
                  <button className="btn-icon btn-ghost" onClick={() => openEdit(g)}><Edit2 size={16} /></button>
                  <button className="btn-icon btn-ghost text-danger" onClick={() => handleDelete(g.id)}><Trash2 size={16} /></button>
                </div>
              </div>

              <h3 className="goal-name">{g.name}</h3>
              
              <div className="goal-amounts">
                <span className="goal-current">{formatCurrency(g.current_amount)}</span>
                <span className="goal-target">/ {formatCurrency(g.target_amount)}</span>
              </div>

              <div className="goal-progress-wrap">
                <div className="goal-progress-bar">
                  <div 
                    className="goal-progress-fill" 
                    style={{ width: `${progress}%`, background: g.color }}
                  />
                </div>
                <div className="goal-progress-text">
                  <span>{progress}% Tercapai</span>
                  {g.deadline && <span className="text-muted">Target: {new Date(g.deadline).toLocaleDateString('id-ID')}</span>}
                </div>
              </div>

              {isCompleted ? (
                <div className="goal-completed-badge">
                  <CheckCircle size={16} /> Target Tercapai!
                </div>
              ) : (
                <div className="goal-add-fund-wrap">
                  {/* Future enhancement: add fund button */}
                  <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={12} /> Terus menabung! Kurang {formatCurrency(g.target_amount - g.current_amount)} lagi.
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {goals.length === 0 && !showForm && (
          <div className="empty-state">
            <Target size={48} className="text-muted" />
            <h3>Belum ada target</h3>
            <p className="text-secondary text-sm">Buat target impian Anda sekarang</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Target' : 'Buat Target Baru'}</h3>
              <button className="btn-icon btn-ghost" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={saveGoal} className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Target (Impian)</label>
                <input required className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Contoh: Beli Laptop Baru" />
              </div>

              <div className="form-group">
                <label className="form-label">Berapa dana yang dibutuhkan?</label>
                <input required type="number" min="1" className="form-input" value={form.target_amount} onChange={e => setForm({...form, target_amount: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Dana terkumpul saat ini (Opsional)</label>
                <input type="number" min="0" className="form-input" value={form.current_amount} onChange={e => setForm({...form, current_amount: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Target Tanggal Tercapai (Opsional)</label>
                <input type="date" className="form-input" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Warna Target</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" 
                      onClick={() => setForm({...form, color: c})}
                      style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                        boxShadow: form.color === c ? `0 0 0 3px ${c}40, inset 0 0 0 2px white` : 'none'
                      }} 
                    />
                  ))}
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Target</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
