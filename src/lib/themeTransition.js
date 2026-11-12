import { flushSync } from 'react-dom';

const resolve = (theme) => (theme === 'system'
  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : theme);

/**
 * Ganti tema dengan efek lingkaran yang melebar dari tombol yang diklik
 * (View Transitions API). Browser yang belum mendukung, atau perangkat dengan
 * "kurangi gerakan", langsung berganti tanpa animasi.
 */
export function switchTheme(next, setTheme, event) {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce || root.getAttribute('data-theme') === resolve(next)) {
    setTheme(next);
    return;
  }

  // Titik asal: tengah tombol yang diklik (juga benar untuk klik lewat keyboard)
  const rect = event?.currentTarget?.getBoundingClientRect?.();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  // Transisi warna CSS dimatikan sebentar agar tampilan baru langsung bertema baru
  root.classList.add('theme-switching');
  const transition = document.startViewTransition(() => {
    flushSync(() => setTheme(next));
    root.setAttribute('data-theme', resolve(next));
  });
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => root.classList.remove('theme-switching'));
}
