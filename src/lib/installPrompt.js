import { useEffect, useState } from 'react';

/**
 * Tombol "Instal aplikasi" di dalam app.
 *
 * Chrome (Android & desktop) mengirim `beforeinstallprompt` saat situs memenuhi syarat
 * instal. Event-nya ditahan di sini (dipasang sejak modul dimuat, karena bisa datang
 * sebelum React selesai render) lalu dipakai saat pengguna menekan tombol instal.
 * Safari iOS tidak punya event ini — di sana pengguna memakai Bagikan → Tambahkan ke Layar Utama.
 */
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // tampilkan lewat tombol kita sendiri
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

const isStandalone = () => typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

export function getPlatform() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Membuka dialog instal Chrome. Hasil: 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  const event = deferredPrompt;
  if (!event) return 'unavailable';
  deferredPrompt = null;
  notify();
  await event.prompt();
  const choice = await event.userChoice;
  return choice?.outcome || 'dismissed';
}

export function useInstallPrompt() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const update = () => rerender((n) => n + 1);
    listeners.add(update);
    const mq = window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change', update);
    return () => {
      listeners.delete(update);
      mq?.removeEventListener?.('change', update);
    };
  }, []);
  const installed = isStandalone();
  return { canInstall: !!deferredPrompt && !installed, installed, platform: getPlatform(), promptInstall };
}
