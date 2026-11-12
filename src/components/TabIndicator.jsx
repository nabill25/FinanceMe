import { motion } from 'framer-motion';

const SLIDE = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 };

/**
 * Pil (atau garis bawah) tab aktif yang meluncur ke tab yang baru dipilih.
 * Taruh di dalam tombol tab yang aktif; `id` harus unik per grup tab (pakai useId()).
 */
export default function TabIndicator({ id, variant = 'pill' }) {
  return (
    <motion.span
      layoutId={id}
      className={variant === 'line' ? 'line-tab-indicator' : 'tab-indicator'}
      transition={SLIDE}
      aria-hidden="true"
    />
  );
}
