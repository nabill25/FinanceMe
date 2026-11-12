import { cloneElement, isValidElement, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import QuickAddModal from '../QuickAddModal';
import { useAuthStore } from '../../store/authStore';
import { useFinanceStore } from '../../store/financeStore';
import { useUiStore } from '../../store/uiStore';
import './Layout.css';

// Halaman lama memudar + buram saat halaman baru masuk (crossfade)
const PAGE_EXIT = { opacity: 0, filter: 'blur(6px)', transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } };

export default function Layout({ children }) {
  const location = useLocation();
  const { pathname } = location;
  const { user } = useAuthStore();
  const { fetchAccounts, fetchRecurringBills } = useFinanceStore();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const mainRef = useRef(null);

  // Data kecil untuk sidebar (saldo aman, badge tagihan) tersedia di halaman mana pun
  useEffect(() => {
    if (!user) return;
    fetchAccounts(user.id);
    fetchRecurringBills(user.id);
  }, [user, fetchAccounts, fetchRecurringBills]);

  // Halaman baru selalu dibuka dari atas. Di desktop yang di-scroll adalah panel
  // konten di dalam "jendela", di HP halaman itu sendiri.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
      mainRef.current.classList.remove('is-scrolled');
    }
  }, [pathname]);

  // Top bar mendapat latar saat konten di-scroll (tanpa re-render halaman)
  const onScroll = (e) => {
    const el = e.currentTarget;
    const scrolled = el.scrollTop > 6;
    if (scrolled !== el.classList.contains('is-scrolled')) el.classList.toggle('is-scrolled', scrolled);
  };

  // Halaman yang sedang keluar tetap merender rute lamanya
  const page = isValidElement(children) ? cloneElement(children, { location }) : children;

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      <main className="layout-main" ref={mainRef} onScroll={onScroll}>
        <TopBar />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={pathname} className="layout-content page-transition" exit={PAGE_EXIT}>
            {page}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
      <QuickAddModal />
    </div>
  );
}
