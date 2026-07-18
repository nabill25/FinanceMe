import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Check, ShieldAlert } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';
import './NotificationBell.css';

export default function NotificationBell() {
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } = useFinanceStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-success" />;
      case 'warning': return <AlertCircle size={16} className="text-warning" />;
      case 'danger': return <ShieldAlert size={16} className="text-danger" />;
      default: return <Info size={16} className="text-primary" />;
    }
  };

  const handleRequestPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      <button 
        className="btn btn-icon btn-ghost notification-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          handleRequestPermission();
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown animate-scale-in">
          <div className="notification-header">
            <h4>Notifikasi</h4>
            {unreadCount > 0 && (
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => markAllNotificationsAsRead(user.id)}
              >
                <Check size={14} style={{ marginRight: 4 }} /> Tandai baca semua
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={24} style={{ opacity: 0.2 }} />
                <p>Belum ada notifikasi.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => {
                    if (!notif.is_read) markNotificationAsRead(notif.id);
                  }}
                >
                  <div className="notification-icon">
                    {getIcon(notif.type)}
                  </div>
                  <div className="notification-content">
                    <h5 className="notification-title">{notif.title}</h5>
                    <p className="notification-message">{notif.message}</p>
                    <span className="notification-time">
                      {new Date(notif.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {!notif.is_read && <div className="unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
