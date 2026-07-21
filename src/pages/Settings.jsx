import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Clock, Info, Palette } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import './Settings.css';

const PERIOD_OPTIONS = [
  { value: 'daily',  label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
];

const COOLDOWN_OPTIONS = [
  { value: 1,  label: '1 Jam' },
  { value: 2,  label: '2 Jam' },
  { value: 6,  label: '6 Jam' },
  { value: 12, label: '12 Jam' },
  { value: 24, label: '24 Jam' },
  { value: 48, label: '2 Hari' },
];

function Countdown({ targetDate }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setRemaining('Selesai'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return <span className="countdown-timer">{remaining}</span>;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { spendingLimit, spendingGuardState, fetchSpendingLimit, upsertSpendingLimit, checkSpendingGuard, aiPersonality, setAiPersonality, paymentInfo, setPaymentInfo } = useFinanceStore();
  const { t, language, setLanguage } = useLanguageStore();

  const [form, setForm] = useState({
    limit_amount: '',
    period: 'daily',
    cooldown_hours: 6,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchSpendingLimit(user.id);
  }, [user, fetchSpendingLimit]);

  useEffect(() => {
    if (spendingLimit) {
      setForm({
        limit_amount: spendingLimit.limit_amount,
        period: spendingLimit.period,
        cooldown_hours: spendingLimit.cooldown_hours,
        is_active: spendingLimit.is_active,
      });
    }
  }, [spendingLimit]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await upsertSpendingLimit(user.id, { ...form, limit_amount: Number(form.limit_amount) });
      checkSpendingGuard(user.id, { ...form, limit_amount: Number(form.limit_amount) });
      toast.success('Pengaturan batas pengeluaran disimpan!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const theme = useFinanceStore(state => state.theme);
  const accentColor = useFinanceStore(state => state.accentColor);
  const setTheme = useFinanceStore(state => state.setTheme);
  const setAccentColor = useFinanceStore(state => state.setAccentColor);

  const ACCENT_COLORS = [
    { value: 'default', color: '#6366f1' }, // Indigo
    { value: 'blue', color: '#3b82f6' },
    { value: 'emerald', color: '#10b981' },
    { value: 'rose', color: '#f43f5e' },
    { value: 'amber', color: '#f59e0b' },
  ];

  const isBlocked = spendingGuardState?.blocked;
  const pct = spendingGuardState?.pct ?? 0;
  const totalSpent = spendingGuardState?.totalSpent ?? 0;

  return (
    <div className="settings-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>⚙️ Pengaturan</h1>
          <p className="text-secondary text-sm">Kelola preferensi dan batas pengeluaran</p>
        </div>
      </div>

      {/* Spending Guard Status Banner */}
      {spendingLimit?.is_active && (
        <div className={`guard-banner card ${isBlocked ? 'guard-blocked' : pct >= 80 ? 'guard-warning' : 'guard-ok'}`}>
          <div className="guard-banner-icon">
            {isBlocked ? <ShieldAlert size={24} /> : pct >= 80 ? <Shield size={24} /> : <ShieldCheck size={24} />}
          </div>
          <div className="guard-banner-content">
            {isBlocked ? (
              <>
                <p className="guard-banner-title">🚫 Transaksi Diblokir Sementara</p>
                <p className="guard-banner-sub">
                  Batas {spendingLimit.period === 'daily' ? 'harian' : 'mingguan'} terlampaui.
                  Coba lagi dalam: <Countdown targetDate={spendingGuardState.unblock_at} />
                </p>
              </>
            ) : pct >= 80 ? (
              <>
                <p className="guard-banner-title">⚠️ Mendekati Batas Pengeluaran!</p>
                <p className="guard-banner-sub">
                  Sudah dipakai {Math.round(pct)}% dari limit {formatCurrency(spendingLimit.limit_amount)}.
                  Sisa: {formatCurrency(spendingLimit.limit_amount - totalSpent)}
                </p>
              </>
            ) : (
              <>
                <p className="guard-banner-title">✅ Pengeluaran Terkontrol</p>
                <p className="guard-banner-sub">
                  Terpakai {formatCurrency(totalSpent)} dari {formatCurrency(spendingLimit.limit_amount)} ({Math.round(pct)}%)
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spending Guard Settings */}
      <div className="card settings-section">
        <div className="settings-section-header">
          <Shield size={20} style={{ color: '#6366f1' }} />
          <h2>Spending Guard — Batas Pengeluaran</h2>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: '20px' }}>
          Tetapkan batas pengeluaran harian/mingguan. Jika batas terlampaui, transaksi baru akan
          diblokir selama waktu <em>cooldown</em> yang Anda tentukan.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active toggle */}
          <div className="settings-toggle-row">
            <div>
              <p style={{ fontWeight: 600 }}>Aktifkan Spending Guard</p>
              <p className="text-sm text-muted">Blokir transaksi saat batas terlampaui</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <span className="toggle-track" />
            </label>
          </div>

          {form.is_active && (
            <>
              <div className="form-group">
                <label className="form-label">Periode</label>
                <div className="tabs" style={{ width: 'auto' }}>
                  {PERIOD_OPTIONS.map(p => (
                    <button key={p.value} type="button"
                      className={`tab ${form.period === p.value ? 'active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, period: p.value }))}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Batas Pengeluaran {form.period === 'daily' ? 'Harian' : 'Mingguan'} (Rp)</label>
                <input className="form-input" type="number" min="1" value={form.limit_amount}
                  onChange={e => setForm(f => ({ ...f, limit_amount: e.target.value }))}
                  placeholder="Contoh: 200000" required />
              </div>
              <div className="form-group">
                <label className="form-label">Durasi Cooldown <Clock size={13} style={{ verticalAlign: 'middle' }} /></label>
                <p className="text-xs text-muted" style={{ marginBottom: '8px' }}>
                  Berapa lama transaksi diblokir setelah batas terlampaui
                </p>
                <select className="form-select" value={form.cooldown_hours}
                  onChange={e => setForm(f => ({ ...f, cooldown_hours: Number(e.target.value) }))}>
                  {COOLDOWN_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>

      {/* Info Card */}
      <div className="card settings-info">
        <Info size={16} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>Cara Kerja Spending Guard</p>
          <ol className="text-sm text-muted" style={{ paddingLeft: '16px', lineHeight: '1.8' }}>
            <li>Anda menetapkan batas pengeluaran (misal: Rp 200.000/hari).</li>
            <li>Setiap kali ada transaksi pengeluaran, sistem menghitung total di periode berjalan.</li>
            <li>Ketika batas terlampaui, banner peringatan muncul di halaman Transaksi.</li>
            <li>Sistem menghitung waktu cooldown dari transaksi terakhir. Setelah waktu habis, Anda bisa bertransaksi lagi.</li>
          </ol>
        </div>
      </div>
      {/* Appearance Settings */}
      <div className="card settings-section">
        <div className="settings-section-header">
          <Palette size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2>Tampilan & Tema</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="form-label">Mode Tema</label>
            <div className="theme-options">
              {[
                { id: 'system', label: '📱 Sistem' },
                { id: 'light', label: '☀️ Terang' },
                { id: 'dark', label: '🌙 Gelap' },
                { id: 'dark-amoled', label: '🌌 AMOLED (Hitam Pekat)' }
              ].map(t => (
                <button
                  key={t.id}
                  className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                  onClick={() => setTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Warna Aksen</label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  className={`accent-color-btn ${accentColor === c.value ? 'active' : ''}`}
                  style={{ backgroundColor: c.color }}
                  onClick={() => setAccentColor(c.value)}
                  title={`Ganti warna ke ${c.value}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* AI Personality Selection */}
        <div className="settings-section" style={{ marginTop: '32px' }}>
          <div className="settings-section-header">
            <h2>🧠 {t('settings.aiPersonality') || 'Kepribadian Asisten AI'}</h2>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: '20px' }}>
            {t('settings.aiPersonalityDesc') || 'Pilih gaya bahasa yang digunakan oleh Asisten AI Gemini saat merespons pertanyaan Anda.'}
          </p>
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label className="form-label">{t('settings.selectAiPersonality') || 'Pilih Kepribadian'}</label>
            <select 
              className="form-select" 
              value={aiPersonality} 
              onChange={e => setAiPersonality(e.target.value)}
            >
              <option value="professional">👔 {t('settings.aiPro') || 'Profesional & Ramah (Default)'}</option>
              <option value="roast">🔥 {t('settings.aiRoast') || 'Roast Mode (Galak & Sarkas)'}</option>
              <option value="zen">🧘 {t('settings.aiZen') || 'Zen Mode (Suportif & Sabar)'}</option>
            </select>
          </div>
        </div>

        {/* Language Selection */}
        <div className="settings-section" style={{ marginTop: '32px' }}>
          <div className="settings-section-header">
            <h2>🌍 {t('settings.language') || 'Bahasa'}</h2>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: '20px' }}>
            {t('settings.languageDesc') || 'Pilih bahasa antarmuka aplikasi.'}
          </p>
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label className="form-label">{t('settings.selectLanguage') || 'Pilih Bahasa'}</label>
            <select 
              className="form-select" 
              value={language} 
              onChange={e => setLanguage(e.target.value)}
            >
              <option value="id">🇮🇩 {t('settings.indonesian') || 'Bahasa Indonesia'}</option>
              <option value="en">🇺🇸 {t('settings.english') || 'English'}</option>
            </select>
          </div>
        </div>

        {/* Payment Info */}
        <div className="settings-section" style={{ marginTop: '32px' }}>
          <div className="settings-section-header">
            <h2>💳 {t('settings.paymentInfoTitle') || 'Informasi Pembayaran'}</h2>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: '20px' }}>
            {t('settings.paymentInfoDesc') || 'Informasi rekening yang akan otomatis disisipkan saat mengirim pesan tagihan (Split Bill).'}
          </p>
          <div className="form-group" style={{ maxWidth: '400px' }}>
            <label className="form-label">{t('settings.paymentInfoLabel') || 'Nomor Rekening / E-Wallet'}</label>
            <input 
              className="form-input" 
              type="text" 
              value={paymentInfo} 
              onChange={e => setPaymentInfo(e.target.value)}
              placeholder="Contoh: BCA 1234567890 a.n Budi"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
