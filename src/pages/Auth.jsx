import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';
import './Auth.css';


export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        navigate('/');
      } else {
        if (!fullName) { toast.error('Nama lengkap wajib diisi'); setLoading(false); return; }
        await signUp(email, password, fullName);
        toast.success('Akun berhasil dibuat! Silakan cek email untuk verifikasi.');
        setMode('login');
      }
    } catch (err) {
      console.error("Auth Error:", err);
      let errMsg = 'Terjadi kesalahan';
      if (typeof err === 'string') errMsg = err;
      else if (err?.message) errMsg = err.message;
      else if (err?.error_description) errMsg = err.error_description;
      else errMsg = JSON.stringify(err);
      
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background blobs */}
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />

      <div className="auth-card card animate-slide-up">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Wallet size={28} strokeWidth={2.5} />
          </div>
          <h1 className="auth-logo-text">FinanceMe</h1>
          <p className="auth-tagline">Kendalikan keuangan Anda, kendalikan hidup Anda</p>
        </div>

        {/* Setup warning */}
        {!isSupabaseConfigured && (
          <div className="auth-setup-warning">
            <AlertTriangle size={16} />
            <div>
              <strong>Perlu konfigurasi Supabase!</strong>
              <p>Edit file <code>.env.local</code> dengan URL dan Anon Key dari project Supabase Anda, lalu jalankan ulang <code>npm run dev</code>.</p>
            </div>
          </div>
        )}

        {/* Tabs */}

        <div className="tabs" style={{ marginBottom: '24px' }}>
          <button
            className={`tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Masuk
          </button>
          <button
            className={`tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            Daftar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input
                className="form-input"
                type="text"
                placeholder="Nama lengkap Anda"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="email@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kata Sandi</label>
            <div className="auth-password-wrapper">
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Min. 6 karakter' : 'Kata sandi Anda'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="auth-show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                {mode === 'login' ? 'Masuk' : 'Buat Akun'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="auth-footer">
          {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button
            className="auth-switch"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Daftar sekarang' : 'Masuk di sini'}
          </button>
        </p>
      </div>
    </div>
  );
}
