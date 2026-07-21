import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Target, Wand2 } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import {
  formatCurrency, getCurrentMonth, getMonthLabel,
  CATEGORY_ICONS, clamp
} from '../lib/utils';
import BudgetSimulatorWidget from '../components/dashboard/BudgetSimulatorWidget';
import BottomSheet from '../components/BottomSheet';
import VisualBudget from '../components/VisualBudget';
import { toast } from 'sonner';
import './Budget.css';

function BudgetModal({ open, onClose, categories, usedCategoryIds, userId, month, onSave }) {
  const [form, setForm] = useState({ category_id: '', amount: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ category_id: '', amount: '' });
  }, [open]);

  if (!open) return null;

  const available = categories.filter(c => c.type === 'expense' && !usedCategoryIds.includes(c.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_id || !form.amount) return;
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(form.amount), user_id: userId, month });
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={open} onClose={onClose} title="Buat Anggaran">
        {available.length === 0 ? (
          <p className="text-secondary text-sm" style={{ padding: '16px 0' }}>
            Semua kategori sudah memiliki anggaran bulan ini.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select className="form-select" value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                <option value="">Pilih kategori</option>
                {available.map(c => (
                  <option key={c.id} value={c.id}>{CATEGORY_ICONS[c.icon]} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Batas Anggaran (Rp)</label>
              <input className="form-input" type="number" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" required min="1" />
            </div>
            <div className="modal-footer" style={{ padding: 0, border: 'none', margin: 0 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Buat Anggaran'}
              </button>
            </div>
          </form>
        )}
    </BottomSheet>
  );
}

function BudgetTemplateModal({ open, onClose, categories, usedCategoryIds, userId, month, onSave }) {
  const [income, setIncome] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!income) return;
    setSaving(true);
    
    const totalIncome = Number(income);
    const needsAmount = totalIncome * 0.5; // 50%
    const wantsAmount = totalIncome * 0.3; // 30%

    // Target specific category names (from DEFAULT_CATEGORIES)
    const needsNames = ['Tagihan & Utilitas', 'Makanan & Minuman', 'Transportasi', 'Perumahan', 'Kesehatan', 'Pendidikan'];
    const wantsNames = ['Hiburan', 'Belanja'];

    const available = categories.filter(c => c.type === 'expense' && !usedCategoryIds.includes(c.id));
    const availableNeeds = available.filter(c => needsNames.includes(c.name));
    const availableWants = available.filter(c => wantsNames.includes(c.name));

    try {
      const promises = [];
      if (availableNeeds.length > 0) {
        const amountPerNeed = Math.floor(needsAmount / availableNeeds.length);
        availableNeeds.forEach(c => {
          promises.push(onSave({ category_id: c.id, amount: amountPerNeed, user_id: userId, month }));
        });
      }
      if (availableWants.length > 0) {
        const amountPerWant = Math.floor(wantsAmount / availableWants.length);
        availableWants.forEach(c => {
          promises.push(onSave({ category_id: c.id, amount: amountPerWant, user_id: userId, month }));
        });
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
        toast.success(`${promises.length} anggaran berhasil dibuat berdasarkan template 50/30/20!`);
      } else {
        toast.error('Semua kategori untuk template ini sudah memiliki anggaran.');
      }
      onClose();
    } catch (err) {
      toast.error('Gagal menerapkan template anggaran');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={open} onClose={onClose} title="✨ Template Anggaran 50/30/20">
        
        <div style={{ padding: '16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Aturan 50/30/20 membagi pendapatan Anda menjadi:
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li><strong>50% Kebutuhan:</strong> Tagihan, Makanan, Transport, dll.</li>
            <li><strong>30% Keinginan:</strong> Hiburan, Belanja.</li>
            <li><strong>20% Tabungan:</strong> (Gunakan fitur Tabungan).</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Total Estimasi Pendapatan Bulan Ini (Rp)</label>
            <input className="form-input" type="number" value={income}
              onChange={e => setIncome(e.target.value)} placeholder="Misal: 10000000" required min="1" autoFocus />
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none', margin: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Terapkan Template'}
            </button>
          </div>
        </form>
    </BottomSheet>
  );
}

function BudgetCard({ budget, spent, onDelete, onEdit }) {
  const pct = budget.amount > 0 ? clamp((spent / budget.amount) * 100, 0, 100) : 0;
  const remaining = budget.amount - spent;
  const isOver = spent > budget.amount;
  const isWarning = !isOver && pct > 70;

  const barColor = isOver
    ? 'var(--gradient-danger)'
    : isWarning
    ? 'var(--gradient-warning)'
    : 'var(--gradient-success)';

  const statusColor = isOver ? 'var(--accent-danger)' : isWarning ? 'var(--accent-warning)' : 'var(--accent-success)';
  const statusText = isOver ? 'Melebihi anggaran!' : isWarning ? 'Hampir habis' : 'Aman';

  return (
    <div className={`budget-card card ${isOver ? 'budget-over' : ''}`}>
      <div className="budget-card-header">
        <div className="budget-card-cat">
          <div className="budget-cat-icon" style={{ background: (budget.categories?.color || '#6b7280') + '22' }}>
            {CATEGORY_ICONS[budget.categories?.icon] || '📂'}
          </div>
          <div>
            <div className="budget-cat-name">{budget.categories?.name}</div>
            <div className="budget-cat-status" style={{ color: statusColor }}>
              {statusText}
            </div>
          </div>
        </div>
        <div className="budget-card-actions">
          <button className="btn btn-icon btn-ghost" onClick={() => onDelete(budget.id)} style={{ color: 'var(--accent-danger)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="budget-amounts">
        <div>
          <p className="text-xs text-muted">Terpakai</p>
          <p className="budget-spent" style={{ color: isOver ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
            {formatCurrency(spent)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="text-xs text-muted">Sisa</p>
          <p className="budget-remaining" style={{ color: remaining < 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
            {remaining < 0 ? '-' : ''}{formatCurrency(Math.abs(remaining))}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <div className="flex justify-between" style={{ marginTop: '4px' }}>
          <span className="text-xs text-muted">{pct.toFixed(0)}% terpakai</span>
          <span className="text-xs text-muted">Batas: {formatCurrency(budget.amount)}</span>
        </div>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const { user } = useAuthStore();
  const {
    budgets, categories, transactions,
    fetchBudgets, fetchCategories, fetchTransactions,
    addBudget, deleteBudget,
    getCategorySpending,
  } = useFinanceStore();

  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [isVisualMode, setIsVisualMode] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCategories(user.id);
    fetchTransactions(user.id, { month: currentMonth });
    fetchBudgets(user.id, currentMonth);
  }, [user, currentMonth]);

  const categorySpending = getCategorySpending(currentMonth);

  const budgetsWithSpending = useMemo(() => {
    return budgets.map(b => {
      const spent = categorySpending.find(c => c.category_id === b.category_id)?.total || 0;
      return { ...b, spent };
    });
  }, [budgets, categorySpending]);

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgetsWithSpending.reduce((s, b) => s + b.spent, 0);
  const overBudget = budgetsWithSpending.filter(b => b.spent > b.amount).length;

  const usedCategoryIds = budgets.map(b => b.category_id);

  const navigateMonth = (dir) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + dir);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus anggaran ini?')) return;
    try {
      await deleteBudget(id);
      toast.success('Anggaran dihapus');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const { updateBudget } = useFinanceStore();
  const handleAllocate = async (budgetId, newAmount) => {
    await updateBudget(budgetId, { amount: newAmount });
  };
  
  const currentMonthIncome = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="budget-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Anggaran</h1>
          <p className="text-secondary text-sm">Kelola batas pengeluaran per kategori</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => setTemplateModalOpen(true)}>
            <Wand2 size={16} /> Template
          </button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Buat
          </button>
        </div>
      </div>

      {/* Month navigator & Toggle */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div className="month-nav card" style={{ flex: 1, margin: 0 }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft size={18} />
          </button>
          <span className="month-nav-label">{getMonthLabel(currentMonth)}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigateMonth(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
        <button 
          className="btn card hover-lift-slight" 
          style={{ 
            background: isVisualMode ? 'var(--accent-primary)' : 'var(--bg-elevated)', 
            color: isVisualMode ? 'white' : 'var(--text-primary)',
            padding: '0 16px'
          }}
          onClick={() => setIsVisualMode(!isVisualMode)}
        >
          {isVisualMode ? 'Kembali' : 'Amplop Visual ✨'}
        </button>
      </div>

      {isVisualMode ? (
        <VisualBudget 
          budgets={budgetsWithSpending} 
          categories={categories} 
          totalIncome={currentMonthIncome} 
          onAllocate={handleAllocate} 
        />
      ) : (
        <>
          {/* Summary */}
          {budgets.length > 0 && (
        <div className="budget-summary card">
          <div className="budget-summary-hero">
            <div>
              <p className="text-sm text-muted">Total Anggaran</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {formatCurrency(totalBudget)}
              </h2>
            </div>
            <div className="budget-summary-stats">
              <div className="budget-stat">
                <span className="text-xs text-muted">Terpakai</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-danger)' }}>{formatCurrency(totalSpent)}</span>
              </div>
              <div className="budget-stat">
                <span className="text-xs text-muted">Sisa</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-success)' }}>
                  {formatCurrency(Math.max(totalBudget - totalSpent, 0))}
                </span>
              </div>
              {overBudget > 0 && (
                <div className="badge badge-danger">
                  ⚠️ {overBudget} kategori over budget
                </div>
              )}
            </div>
          </div>
          <div className="progress-bar-container" style={{ height: '10px' }}>
            <div className="progress-bar" style={{
              width: `${clamp((totalSpent / totalBudget) * 100, 0, 100)}%`,
              background: totalSpent > totalBudget ? 'var(--gradient-danger)' : 'var(--gradient-primary)',
            }} />
          </div>
          <div className="flex justify-between" style={{ marginTop: '6px' }}>
            <span className="text-xs text-muted">{((totalSpent / totalBudget) * 100).toFixed(0)}% terpakai</span>
            <span className="text-xs text-muted">{budgets.length} kategori</span>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="empty-state card">
          <Target size={48} style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
          <h3>Belum ada anggaran</h3>
          <p>Buat anggaran untuk memantau pengeluaran per kategori</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-outline" onClick={() => setTemplateModalOpen(true)}>
              <Wand2 size={16} /> Gunakan Template
            </button>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Buat Anggaran
            </button>
          </div>
        </div>
      ) : (
        <div className="budget-grid">
          {budgetsWithSpending.map(b => (
            <BudgetCard
              key={b.id}
              budget={b}
              spent={b.spent}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
        </>
      )}

      <BudgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        usedCategoryIds={usedCategoryIds}
        userId={user?.id}
        month={currentMonth}
        onSave={addBudget}
      />
      <BudgetTemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        categories={categories}
        usedCategoryIds={usedCategoryIds}
        userId={user?.id}
        month={currentMonth}
        onSave={addBudget}
      />
    </div>
  );
}
