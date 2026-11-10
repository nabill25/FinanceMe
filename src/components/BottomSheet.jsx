import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../lib/scrollLock';
import './BottomSheet.css';

const DESKTOP_QUERY = '(min-width: 768px)';
const SHEET_SPRING = { type: 'spring', damping: 30, stiffness: 260, mass: 0.9 };

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

/**
 * Sheet dari bawah (HP) / dialog di tengah (desktop).
 * - Dirender lewat portal ke <body> supaya posisinya selalu relatif ke layar,
 *   tidak terpengaruh transform/animasi milik halaman.
 * - Geser ke bawah untuk menutup hanya dari pegangan/judul, sehingga isi form tetap bisa di-scroll.
 */
export default function BottomSheet({ isOpen, onClose, title, children }) {
  const isDesktop = useIsDesktop();
  const dragControls = useDragControls();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    const onKeyDown = (e) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const startDrag = (e) => {
    if (!isDesktop) dragControls.start(e);
  };

  const sheetMotion = isDesktop
    ? {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] },
      }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: SHEET_SPRING };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            className="bottom-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className="bottom-sheet"
            role="dialog"
            aria-modal="true"
            {...sheetMotion}
            drag={isDesktop ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
          >
            <div className="bottom-sheet-drag-handle" onPointerDown={startDrag}>
              <div className="drag-handle-bar" />
            </div>
            {title && (
              <div className="bottom-sheet-header" onPointerDown={startDrag}>
                <span className="bottom-sheet-title">{title}</span>
                <button
                  className="btn btn-icon btn-ghost"
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Tutup"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="bottom-sheet-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
