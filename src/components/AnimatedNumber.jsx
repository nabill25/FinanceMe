import { useMemo } from 'react';
import CountUp from 'react-countup';
import { formatCurrency } from '../lib/utils';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Angka yang berhitung naik saat muncul, dan bergerak halus dari nilai lama ke nilai baru
 * saat berubah (mis. setelah transaksi ditambah).
 *
 * `format` harus fungsi yang stabil (didefinisikan di luar komponen): react-countup memulai
 * ulang hitungan setiap kali fungsi format berganti.
 */
export default function AnimatedNumber({ value, currency = 'IDR', format, duration = 1.2 }) {
  const n = Number(value) || 0;
  const formatter = useMemo(
    () => format || ((v) => formatCurrency(Math.round(v), currency)),
    [format, currency],
  );
  if (prefersReducedMotion()) return <span className="num-anim">{formatter(n)}</span>;
  return (
    <CountUp
      className="num-anim"
      start={0}
      end={n}
      duration={duration}
      formattingFn={formatter}
      preserveValue
      useEasing
    />
  );
}
