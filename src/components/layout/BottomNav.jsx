import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, Plus, Wallet, Menu } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useLanguageStore } from '../../store/languageStore';
import { tapFeedback } from '../../lib/scrollLock';
import './BottomNav.css';

const PILL_SPRING = { type: 'spring', stiffness: 380, damping: 32 };

const TABS = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, labelKey: 'nav.transactions' },
  { to: '/accounts', icon: Wallet, labelKey: 'common.account' },
];

/** Navigasi bawah khusus HP: 3 halaman utama, tombol tambah di tengah, dan Menu (drawer). */
export default function BottomNav() {
  const { pathname } = useLocation();
  const { t } = useLanguageStore();
  const { drawerOpen, setDrawerOpen, setQuickAddOpen } = useUiStore();

  // Asisten AI tampil layar penuh seperti aplikasi chat
  if (pathname === '/advisor') return null;

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));
  const onMainTab = TABS.some((tab) => isActive(tab.to));
  const menuActive = drawerOpen || !onMainTab;

  const renderTab = (tab) => {
    const active = isActive(tab.to) && !drawerOpen;
    const Icon = tab.icon;
    return (
      <NavLink
        key={tab.to}
        to={tab.to}
        end={tab.to === '/'}
        className={`bottom-nav-item ${active ? 'active' : ''}`}
        onClick={tapFeedback}
      >
        {active && <motion.span layoutId="bottom-nav-pill" className="bottom-nav-pill" transition={PILL_SPRING} />}
        <Icon size={22} />
        <span className="bottom-nav-label">{t(tab.labelKey)}</span>
      </NavLink>
    );
  };

  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {renderTab(TABS[0])}
      {renderTab(TABS[1])}

      <button
        type="button"
        className="bottom-nav-add"
        aria-label="Catat transaksi"
        onClick={() => { tapFeedback(); setQuickAddOpen(true); }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {renderTab(TABS[2])}

      <button
        type="button"
        className={`bottom-nav-item ${menuActive ? 'active' : ''}`}
        aria-label="Buka menu"
        aria-expanded={drawerOpen}
        onClick={() => { tapFeedback(); setDrawerOpen(true); }}
      >
        {menuActive && <motion.span layoutId="bottom-nav-pill" className="bottom-nav-pill" transition={PILL_SPRING} />}
        <Menu size={22} />
        <span className="bottom-nav-label">Menu</span>
      </button>
    </nav>
  );
}
