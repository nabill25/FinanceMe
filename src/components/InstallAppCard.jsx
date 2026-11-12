import { CheckCircle2, Download, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '../lib/installPrompt';

// Cara manual bila dialog instal belum tersedia (mis. Safari iOS, atau Chrome belum siap)
const MANUAL_STEPS = {
  android: 'Di Chrome, buka menu ⋮ lalu pilih “Instal aplikasi” (atau “Tambahkan ke layar utama” → Instal).',
  ios: 'Di Safari, ketuk ikon Bagikan lalu pilih “Tambahkan ke Layar Utama”.',
  desktop: 'Di Chrome atau Edge, klik ikon instal di ujung kanan bilah alamat, atau menu ⋮ → “Instal FinanceMe”.',
};

/** Kartu di Pengaturan: pasang FinanceMe sebagai aplikasi di perangkat ini. */
export default function InstallAppCard() {
  const { canInstall, installed, platform, promptInstall } = useInstallPrompt();

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') toast.success('FinanceMe sedang dipasang di perangkat Anda');
  };

  return (
    <div className="card settings-section install-card">
      <div className="settings-section-header">
        <Smartphone size={20} style={{ color: 'var(--accent-primary)' }} />
        <h2>Aplikasi FinanceMe</h2>
      </div>
      <div className="install-body">
        <img src="/icons/icon-192.png" alt="" width={56} height={56} className="install-icon" />
        <div className="install-text">
          {installed ? (
            <>
              <p className="install-title"><CheckCircle2 size={16} className="install-ok" /> Sudah terpasang</p>
              <p className="text-sm text-muted">FinanceMe sedang terbuka sebagai aplikasi di perangkat ini.</p>
            </>
          ) : (
            <>
              <p className="install-title">Pasang di layar utama</p>
              <p className="text-sm text-muted">
                {canInstall
                  ? 'Buka langsung dari ikon di layar utama, tampil layar penuh tanpa bilah alamat, dan tetap bisa dibuka saat sinyal lemah.'
                  : MANUAL_STEPS[platform]}
              </p>
            </>
          )}
        </div>
        {canInstall && (
          <button type="button" className="btn btn-primary install-btn" onClick={install}>
            <Download size={16} /> Instal
          </button>
        )}
      </div>
    </div>
  );
}
