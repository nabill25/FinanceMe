import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import QuickAddModal from '../QuickAddModal';
import './Layout.css';

export default function Layout({ children }) {
  const { pathname } = useLocation();

  // Halaman baru selalu dibuka dari atas (sebelumnya posisi scroll halaman lama terbawa)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        {/* key = pathname: setiap pindah halaman, animasi masuknya diputar ulang */}
        <div className="layout-content page-transition" key={pathname}>
          {children}
        </div>
      </main>
      <BottomNav />
      <QuickAddModal />
    </div>
  );
}
