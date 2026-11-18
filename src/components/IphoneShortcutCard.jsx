import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, FlaskConical, KeyRound, RefreshCw, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useFinanceStore } from '../store/financeStore';
import { DEFAULT_SUPABASE_URL } from '../lib/supabaseDefaults';
import migrationSql from '../../supabase_step14_iphone_shortcut.sql?raw';

// Shortcut di iPhone selalu memanggil situs live, juga saat halaman ini dibuka dari localhost
const isLocal = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const ENDPOINT = `${isLocal ? 'https://financeme-three.vercel.app' : window.location.origin}/api/shortcut`;
const PROJECT_REF = DEFAULT_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const SQL_EDITOR_URL = PROJECT_REF ? `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new` : 'https://supabase.com/dashboard';

// Contoh layar untuk tombol "Uji coba" (tidak disimpan), memakai nama akun pengguna sendiri
const sampleScreen = (accountName) =>
  `Pembayaran berhasil\nRp25.000\nKopi Kenangan\nBayar pakai QRIS\nMetode pembayaran ${accountName || ''}\nID transaksi UJI-COBA-001`;

const formatTime = (iso) => (iso
  ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  : null);

// PostgREST: tabel belum ada → PGRST205 / 42P01
const isMissingTable = (error) => /PGRST205|42P01|Could not find the table|does not exist/i.test(`${error?.code} ${error?.message}`);

function CopyButton({ value, label = 'Salin' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast.error('Gagal menyalin. Tekan lama teksnya untuk menyalin manual.');
    }
  };
  return (
    <button type="button" className="pill-btn shortcut-copy" onClick={copy}>
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? 'Tersalin' : label}
    </button>
  );
}

/** Kartu di Pengaturan: hubungkan Shortcut iPhone "ketuk belakang" ke FinanceMe. */
export default function IphoneShortcutCard() {
  const [status, setStatus] = useState('loading'); // loading | needs-sql | ready | error
  const [info, setInfo] = useState(null); // { created_at, last_used_at } bila token aktif
  const [token, setToken] = useState(''); // token asli, hanya ada tepat setelah dibuat
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState(null); // { ok, message }
  const accounts = useFinanceStore((s) => s.accounts);
  const sampleAccount = accounts.find((a) => a.type === 'ewallet') || accounts[0];

  const load = async () => {
    setStatus('loading');
    const { data, error } = await supabase.from('shortcut_tokens').select('created_at, last_used_at').maybeSingle();
    if (error) {
      setStatus(isMissingTable(error) ? 'needs-sql' : 'error');
      return;
    }
    setInfo(data);
    setStatus('ready');
  };

  useEffect(() => { load(); }, []);

  const createToken = async () => {
    if (info && !window.confirm('Token lama di Shortcut iPhone akan berhenti bekerja. Buat token baru?')) return;
    setBusy(true);
    setTest(null);
    const { data, error } = await supabase.rpc('create_shortcut_token');
    setBusy(false);
    if (error) {
      toast.error(`Gagal membuat token: ${error.message}`);
      return;
    }
    setToken(data);
    setInfo({ created_at: new Date().toISOString(), last_used_at: null });
    toast.success('Token dibuat. Salin ke Shortcut sekarang — token hanya ditampilkan sekali.');
  };

  const revokeToken = async () => {
    if (!window.confirm('Cabut token? Shortcut iPhone tidak bisa mencatat transaksi lagi sampai dibuat token baru.')) return;
    setBusy(true);
    const { error } = await supabase.rpc('revoke_shortcut_token');
    setBusy(false);
    if (error) {
      toast.error(`Gagal mencabut token: ${error.message}`);
      return;
    }
    setToken('');
    setInfo(null);
    setTest(null);
    toast.success('Token dicabut');
  };

  const runTest = async () => {
    setBusy(true);
    setTest(null);
    try {
      const res = await fetch(`${ENDPOINT}?format=json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, text: sampleScreen(sampleAccount?.name), dry_run: true }),
      });
      const json = await res.json();
      setTest({ ok: !!json.ok, message: json.message });
    } catch {
      setTest({ ok: false, message: 'Server FinanceMe tidak bisa dihubungi. Uji coba hanya berjalan di situs live.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card settings-section shortcut-card">
      <div className="settings-section-header">
        <Zap size={20} style={{ color: 'var(--accent-primary)' }} />
        <h2>Pintasan iPhone</h2>
      </div>
      <p className="text-sm text-muted shortcut-intro">
        Setelah bayar pakai GoPay, DANA, OVO, ShopeePay, atau bank, ketuk dua kali bagian belakang iPhone
        saat layar “Berhasil” tampil. Shortcut membaca layar itu dan FinanceMe mencatat nominal, merchant,
        kategori, serta akunnya otomatis.
      </p>

      {status === 'loading' && <p className="text-sm text-muted">Memeriksa…</p>}

      {status === 'error' && (
        <div className="shortcut-box">
          <p className="text-sm">Status Pintasan iPhone tidak bisa dimuat.</p>
          <button type="button" className="pill-btn" onClick={load}><RefreshCw size={14} /> Coba lagi</button>
        </div>
      )}

      {status === 'needs-sql' && (
        <div className="shortcut-box">
          <p className="shortcut-box-title">Aktifkan dulu di Supabase (sekali saja)</p>
          <ol className="shortcut-steps">
            <li>Salin skrip SQL di bawah.</li>
            <li>Buka SQL Editor project Supabase FinanceMe, tempel skripnya, lalu klik <strong>Run</strong>.</li>
            <li>Kembali ke sini dan klik <strong>Periksa lagi</strong>.</li>
          </ol>
          <div className="shortcut-actions">
            <CopyButton value={migrationSql} label="Salin skrip SQL" />
            <a className="pill-btn" href={SQL_EDITOR_URL} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Buka SQL Editor
            </a>
            <button type="button" className="pill-btn" onClick={load}><RefreshCw size={14} /> Periksa lagi</button>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <>
          {token ? (
            <div className="shortcut-box">
              <p className="shortcut-box-title"><KeyRound size={15} /> Token pribadi Anda</p>
              <code className="shortcut-token">{token}</code>
              <p className="text-xs text-muted">
                Tempel ke Shortcut sekarang (langkah 4 di bawah). Token hanya ditampilkan sekali; kalau hilang, buat token baru.
                Jangan bagikan token ini.
              </p>
              <div className="shortcut-actions">
                <CopyButton value={token} label="Salin token" />
                <button type="button" className="pill-btn" onClick={runTest} disabled={busy}>
                  <FlaskConical size={14} /> Uji coba
                </button>
              </div>
              {test && <p className={`shortcut-test ${test.ok ? 'is-ok' : 'is-bad'}`}>{test.message}</p>}
            </div>
          ) : info ? (
            <div className="shortcut-box">
              <p className="shortcut-box-title"><Check size={15} className="shortcut-ok" /> Token aktif</p>
              <p className="text-sm text-muted">
                Dibuat {formatTime(info.created_at)} · {info.last_used_at ? `terakhir dipakai ${formatTime(info.last_used_at)}` : 'belum pernah dipakai'}
              </p>
            </div>
          ) : null}

          <div className="shortcut-actions">
            <button type="button" className="btn btn-primary" onClick={createToken} disabled={busy}>
              <KeyRound size={16} /> {info ? 'Buat token baru' : 'Buat token'}
            </button>
            {info && (
              <button type="button" className="btn btn-outline" onClick={revokeToken} disabled={busy}>
                <Trash2 size={16} /> Cabut
              </button>
            )}
          </div>

          <details className="shortcut-guide" open={!!token}>
            <summary>Cara menyusun Shortcut di iPhone (sekali saja)</summary>
            <ol className="shortcut-steps">
              <li>Buka app <strong>Pintasan</strong> (<em>Shortcuts</em>), ketuk <strong>+</strong>, beri nama <strong>Catat ke FinanceMe</strong>.</li>
              <li>Tambah tindakan <strong>Ambil Jepretan Layar</strong> (<em>Take Screenshot</em>).</li>
              <li>Tambah <strong>Ekstrak Teks dari Gambar</strong> (<em>Extract Text from Image</em>); otomatis memakai jepretan layar tadi.</li>
              <li>
                Tambah <strong>Dapatkan Isi URL</strong> (<em>Get Contents of URL</em>) dengan URL:
                <span className="shortcut-inline">
                  <code>{ENDPOINT}</code>
                  <CopyButton value={ENDPOINT} label="Salin URL" />
                </span>
                Buka detailnya: <strong>Metode</strong> = POST, <strong>Isi Permintaan</strong> = JSON, lalu tambah dua bidang
                <em> Teks</em>: <code>token</code> berisi token Anda, dan <code>text</code> berisi variabel <strong>Teks</strong> dari langkah 3.
              </li>
              <li>Tambah <strong>Tampilkan Pemberitahuan</strong> (<em>Show Notification</em>) berisi <strong>Isi URL</strong> (<em>Contents of URL</em>).</li>
              <li>
                Buka <strong>Pengaturan</strong> iPhone → <strong>Aksesibilitas</strong> → <strong>Sentuh</strong> →
                <strong> Ketuk Belakang</strong> → <strong>Ketuk Dua Kali</strong> → pilih <strong>Catat ke FinanceMe</strong>.
              </li>
            </ol>
            <p className="text-xs text-muted">
              Saat pertama dijalankan, iPhone meminta izin mengambil jepretan layar dan menghubungi situs FinanceMe; pilih
              <strong> Izinkan Selalu</strong>. Top up dan pindah dana antar akun sendiri tidak dicatat otomatis; catat lewat menu
              Transfer. Layar yang sama tidak akan tercatat dua kali.
            </p>
          </details>
        </>
      )}
    </div>
  );
}
