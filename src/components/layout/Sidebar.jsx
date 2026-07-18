import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight,
  PieChart, BarChart3, HelpCircle, LogOut, Wallet,
  Menu, X, PiggyBank, Settings, Zap
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Wallet, label: 'Akun' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { to: '/savings', icon: PiggyBank, label: 'Tabungan' },
  { to: '/goals', icon: CreditCard, label: 'Target' },
  { to: '/budget', icon: PieChart, label: 'Anggaran' },
  { to: '/reports', icon: BarChart3, label: 'Laporan' },
  { to: '/decision', icon: HelpCircle, label: 'Cek Pembelian' },
  { to: '/settings', icon: Settings, label: 'Pengaturan' },
];

export default function Sidebar() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <>
      {/* Mobile toggle */}
      <button className="sidebar-mobile-toggle" onClick={() => setMobileOpen(true)}>
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wallet size={20} strokeWidth={2.5} />
          </div>
          <span className="sidebar-logo-text">FinanceMe</span>
          <span className="live-badge"><Zap size={10} /> Live</span>
          <button className="sidebar-mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <span className="sidebar-nav-label">Menu</span>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User section */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">
              {user?.user_metadata?.full_name || 'Pengguna'}
            </span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
          <button
            className="sidebar-signout btn btn-icon btn-ghost"
            onClick={handleSignOut}
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
