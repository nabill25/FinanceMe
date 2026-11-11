import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import QuickAddModal from '../QuickAddModal';
import { useAuthStore } from '../../store/authStore';
import { useFinanceStore } from '../../store/financeStore';
import './Layout.css';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const { fetchAccounts, fetchRecurringBills } = useFinanceStore();

  // Data kecil untuk sidebar (saldo aman, badge tagihan) tersedia di halaman mana pun
  useEffect(() => {
    if (!user) return;
    fetchAccounts(user.id);
    fetchRecurringBills(user.id);
  }, [user, fetchAccounts, fetchRecurringBills]);

  // Halaman baru selalu dibuka dari atas (sebelumnya posisi scroll halaman lama terbawa)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        <TopBar />
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
