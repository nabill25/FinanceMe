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
  { to: '/budget', icon: PieChart, label: 'Anggaran' },
  { to: '/savings', icon: PiggyBank, label: 'Tabungan' },
  { to: '/goals', icon: CreditCard, label: 'Target' },
  { to: '/reports', icon: BarChart3, label: 'Laporan' },
  { to: '/decision', icon: HelpCircle, label: 'Cek Pembelian' },
  { to: '/settings', icon: Settings, label: 'Pengaturan' },
];

const mobileMainItems = navItems.slice(0, 4);
const mobileMoreItems = navItems.slice(4);

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
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="sidebar desktop-only">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wallet size={20} strokeWidth={2.5} />
          </div>
          <span className="sidebar-logo-text">FinanceMe</span>
          <span className="live-badge"><Zap size={10} /> Live</span>
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

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className="bottom-nav mobile-only">
        {mobileMainItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button 
          className={`bottom-nav-item ${mobileOpen ? 'active' : ''}`} 
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu size={20} />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* --- MOBILE MORE MENU (BOTTOM SHEET) --- */}
      {mobileOpen && (
        <div className="mobile-only">
          <div className="bottom-sheet-overlay" onClick={() => setMobileOpen(false)} />
          <div className="bottom-sheet animate-slide-up">
            <div className="bottom-sheet-header">
              <div className="bottom-sheet-handle"></div>
              <div className="sidebar-user" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: '0 0 16px 0', borderBottom: '1px solid var(--border-subtle)', borderRadius: 0 }}>
                <div className="sidebar-user-avatar">{initials}</div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user?.user_metadata?.full_name || 'Pengguna'}</span>
                  <span className="sidebar-user-email">{user?.email}</span>
                </div>
              </div>
            </div>
            <div className="bottom-sheet-content">
              {mobileMoreItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                  style={{ padding: '14px 16px', fontSize: '15px' }}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </NavLink>
              ))}
              <button
                className="sidebar-nav-item"
                onClick={handleSignOut}
                style={{ padding: '14px 16px', fontSize: '15px', color: 'var(--accent-danger)' }}
              >
                <LogOut size={20} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
