import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const EASE = [0.22, 0.61, 0.36, 1];
// Tunggu tata letak halaman stabil (grafik di atasnya baru mendapat ukuran setelah
// dipasang). Kalau langsung diamati, semua widget sempat terhitung "terlihat".
const SETTLE_MS = 450;
const VARIANTS = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE } },
};

/**
 * Isi naik & memudar masuk saat pertama kali terlihat di layar (sekali saja).
 * Yang sudah terlihat saat halaman dibuka langsung beranimasi; yang di bawah
 * baru muncul ketika di-scroll ke sana.
 */
export default function Reveal({ children, className }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }
    let observer;
    const timer = setTimeout(() => {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      }, { threshold: 0.12 });
      observer.observe(el);
    }, SETTLE_MS);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  // `animate` selalu berisi varian: Layout memakai <AnimatePresence initial={false}>, yang
  // pada render pertama memakai nilai `animate` sebagai nilai awal. Dengan "hidden" di
  // sana, widget tetap tersembunyi sampai benar-benar terlihat.
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={VARIANTS}
      initial="hidden"
      animate={shown ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  );
}
