// Kunci scroll halaman saat sheet/drawer terbuka. Memakai penghitung supaya
// beberapa lapisan yang terbuka bersamaan tidak saling membuka kunci.
let locks = 0;

export function lockBodyScroll() {
  locks += 1;
  if (locks === 1) document.body.style.overflow = 'hidden';
}

export function unlockBodyScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) document.body.style.overflow = '';
}

/** Getaran singkat sebagai umpan balik sentuhan (hanya di perangkat yang mendukung). */
export function tapFeedback() {
  try {
    navigator.vibrate?.(8);
  } catch {
    // diabaikan: beberapa browser melempar error bila belum ada interaksi pengguna
  }
}
