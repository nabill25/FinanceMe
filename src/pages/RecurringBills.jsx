import { useState, useEffect } from 'react';
import { Plus, Repeat, CalendarClock, CreditCard, ChevronRight, CheckCircle2, Play, Pause, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatCurrencyShort } from '../lib/utils';
import { toast } from 'sonner';
import './RecurringBills.css';

const FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Harian' },
  { id: 'weekly', label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'yearly', label: 'Tahunan' },
];

export default function RecurringBills() {
  const { user } = useAuthStore();
  const { recurringBills, fetchRecurringBills, accounts, categories, addRecurringBill, updateRecurringBill, deleteRecurringBill, processRecurringBills } = useFinanceStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [form, setForm] = useState({
    name: '',
    amount: '',
    type: 'expense',
    category_id: '',
    account_id: '',
    frequency: 'monthly',
    due_date: 1, // day of month or day of week
    next_due: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (user?.id) fetchRecurringBills(user.id);
  }, [user]);

  const resetForm = () => {
    setForm({
      name: '',
      amount: '',
      type: 'expense',
      category_id: categories.length > 0 ? categories[0].id : '',
      account_id: accounts.length > 0 ? accounts[0].id : '',
      frequency: 'monthly',
      due_date: 1,
      next_due: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingId(null);
  };

  const handleOpenModal = (bill = null) => {
    if (bill) {
      setEditingId(bill.id);
      setForm({
        name: bill.name,
        amount: bill.amount,
        type: bill.type,
        category_id: bill.category_id || '',
        account_id: bill.account_id || '',
        frequency: bill.frequency,
        due_date: bill.due_date,
        next_due: bill.next_due,
        notes: bill.notes || ''
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(resetForm, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount || !form.category_id || !form.account_id || !form.next_due) {
      toast.error('Mohon lengkapi data wajib');
      return;
    }

    try {
      const billData = {
        ...form,
        user_id: user.id,
        amount: Number(form.amount)
      };

      if (editingId) {
        await updateRecurringBill(editingId, billData);
        toast.success('Tagihan berulang berhasil diperbarui');
      } else {
        await addRecurringBill(billData);
        toast.success('Tagihan berulang berhasil ditambahkan');
      }
      handleCloseModal();
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan tagihan');
    }
  };

  const handleToggleActive = async (bill) => {
    try {
      await updateRecurringBill(bill.id, { is_active: !bill.is_active });
      toast.success(bill.is_active ? 'Tagihan dinonaktifkan' : 'Tagihan diaktifkan');
    } catch (error) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus tagihan ini?')) return;
    try {
      await deleteRecurringBill(id);
      toast.success('Tagihan berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus tagihan');
    }
  };

  const handleManualProcess = async () => {
    setIsProcessing(true);
    try {
      await processRecurringBills(user.id);
      toast.success('Pengecekan tagihan selesai');
    } catch (error) {
      toast.error('Gagal memproses tagihan: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.round((due - today) / 86400000);
  };

  const activeBills = recurringBills.filter(b => b.is_active);
  const inactiveBills = recurringBills.filter(b => !b.is_active);

  return (
    <div className="recurring-page">
      <div className="recurring-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Repeat size={24} color="var(--accent-primary)" /> Tagihan Berulang
          </h1>
          <p className="text-muted" style={{ fontSize: '14px' }}>Otomatis catat pengeluaran rutin Anda.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={handleManualProcess} disabled={isProcessing}>
            {isProcessing ? <span className="spinner spinner-sm" /> : <Play size={16} />}
            Proses Sekarang
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Tambah Baru
          </button>
        </div>
      </div>

      <div className="recurring-content">
        <div className="recurring-section">
          <h2 className="section-title">Tagihan Aktif ({activeBills.length})</h2>
          
          {activeBills.length === 0 ? (
            <div className="empty-state">
              <CalendarClock size={48} />
              <h3>Belum Ada Tagihan Berulang</h3>
              <p>Tambahkan langganan atau cicilan Anda agar dicatat otomatis setiap periode.</p>
              <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ marginTop: '16px' }}>
                <Plus size={18} /> Buat Tagihan Pertama
              </button>
            </div>
          ) : (
            <div className="recurring-grid">
              {activeBills.sort((a, b) => new Date(a.next_due) - new Date(b.next_due)).map(bill => {
                const daysUntil = getDaysUntil(bill.next_due);
                const isOverdue = daysUntil < 0;
                
                return (
                  <div key={bill.id} className={`bill-card ${isOverdue ? 'overdue' : ''}`}>
                    <div className="bill-card-top">
                      <div className="bill-icon" style={{ background: bill.categories?.color ? `${bill.categories.color}20` : 'var(--bg-main)' }}>
                        <span style={{ fontSize: 24 }}>{bill.categories?.icon || '💸'}</span>
                      </div>
                      <div className="bill-status">
                        {isOverdue ? (
                          <span className="badge badge-danger"><AlertCircle size={12} /> Telat</span>
                        ) : daysUntil === 0 ? (
                          <span className="badge badge-warning">Hari ini</span>
                        ) : (
                          <span className="badge badge-default">{daysUntil} hari lagi</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bill-info">
                      <h3 className="bill-name">{bill.name}</h3>
                      <p className="bill-amount">{formatCurrency(bill.amount)}</p>
                      
                      <div className="bill-details">
                        <div className="bill-detail-item">
                          <Repeat size={14} />
                          <span>{FREQUENCY_OPTIONS.find(f => f.id === bill.frequency)?.label || bill.frequency}</span>
                        </div>
                        <div className="bill-detail-item">
                          <CreditCard size={14} />
                          <span>{bill.accounts?.name || 'Akun tidak diketahui'}</span>
                        </div>
                      </div>
                      
                      <div className="bill-dates">
                        <div className="date-block">
                          <span className="date-label">Berikutnya</span>
                          <span className="date-value">{new Date(bill.next_due).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="date-block">
                          <span className="date-label">Terakhir bayar</span>
                          <span className="date-value">{bill.last_paid ? new Date(bill.last_paid).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bill-actions">
                      <button className="icon-btn" onClick={() => handleOpenModal(bill)} title="Edit"><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={() => handleToggleActive(bill)} title="Pause"><Pause size={16} /></button>
                      <button className="icon-btn danger" onClick={() => handleDelete(bill.id)} title="Hapus"><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {inactiveBills.length > 0 && (
          <div className="recurring-section" style={{ marginTop: 'var(--space-xl)' }}>
            <h2 className="section-title">Tagihan Nonaktif ({inactiveBills.length})</h2>
            <div className="recurring-grid">
              {inactiveBills.map(bill => (
                <div key={bill.id} className="bill-card inactive">
                  <div className="bill-card-top">
                    <div className="bill-icon" style={{ background: 'var(--bg-main)' }}>
                      <span style={{ fontSize: 24, filter: 'grayscale(1)' }}>{bill.categories?.icon || '💸'}</span>
                    </div>
                    <div className="bill-status">
                      <span className="badge badge-default">Di-pause</span>
                    </div>
                  </div>
                  
                  <div className="bill-info">
                    <h3 className="bill-name">{bill.name}</h3>
                    <p className="bill-amount">{formatCurrency(bill.amount)}</p>
                  </div>
                  
                  <div className="bill-actions">
                    <button className="icon-btn" onClick={() => handleToggleActive(bill)} title="Lanjutkan"><Play size={16} /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(bill.id)} title="Hapus"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Tagihan Berulang' : 'Tambah Tagihan Berulang'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Nama Tagihan</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="Contoh: Netflix, Listrik, Kos" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Nominal</label>
                <div className="input-with-icon">
                  <span className="input-icon" style={{ left: 12 }}>Rp</span>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ paddingLeft: 42 }}
                    value={form.amount} 
                    onChange={e => setForm({...form, amount: e.target.value})} 
                    placeholder="0" 
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Frekuensi</label>
                  <select 
                    className="form-input" 
                    value={form.frequency} 
                    onChange={e => setForm({...form, frequency: e.target.value})}
                  >
                    {FREQUENCY_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tanggal Mulai / Jatuh Tempo</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={form.next_due} 
                    onChange={e => {
                      const dateStr = e.target.value;
                      const dateObj = new Date(dateStr);
                      setForm({
                        ...form, 
                        next_due: dateStr,
                        due_date: dateObj.getDate() // Update due_date based on selected date
                      });
                    }} 
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Kategori</label>
                  <select 
                    className="form-input" 
                    value={form.category_id} 
                    onChange={e => setForm({...form, category_id: e.target.value})}
                    required
                  >
                    <option value="" disabled>Pilih kategori...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Bayar Dari Akun</label>
                  <select 
                    className="form-input" 
                    value={form.account_id} 
                    onChange={e => setForm({...form, account_id: e.target.value})}
                    required
                  >
                    <option value="" disabled>Pilih akun...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Catatan Tambahan (Opsional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={form.notes} 
                  onChange={e => setForm({...form, notes: e.target.value})} 
                  placeholder="Keterangan transaksi..." 
                />
              </div>
              
              <div style={{ background: 'rgba(99,102,241,0.05)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} style={{ display: 'inline', color: 'var(--accent-primary)', marginRight: '6px', verticalAlign: 'middle' }} />
                Sistem akan otomatis mencatat pengeluaran ini dan memotong saldo akun pada tanggal jatuh tempo.
              </div>

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Tagihan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
