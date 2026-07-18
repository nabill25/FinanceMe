import Sidebar from './Sidebar';
import QuickAddModal from '../QuickAddModal';
import './Layout.css';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        <div className="layout-content">
          {children}
        </div>
      </main>
      <QuickAddModal />
    </div>
  );
}
