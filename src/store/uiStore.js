import { create } from 'zustand';

const readCollapsed = () => {
  try { return localStorage.getItem('financeme-sidebar') === 'collapsed'; } catch { return false; }
};

// State tampilan (bukan data keuangan) yang dipakai bersama oleh navigasi bawah,
// sidebar/drawer, dan form "Tambah Transaksi Cepat".
export const useUiStore = create((set) => ({
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  quickAddOpen: false,
  setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),
  transferOpen: false,
  setTransferOpen: (transferOpen) => set({ transferOpen }),
  // Sidebar desktop bisa diciutkan menjadi ikon saja; pilihan diingat
  sidebarCollapsed: readCollapsed(),
  toggleSidebar: () => set((s) => {
    const sidebarCollapsed = !s.sidebarCollapsed;
    try { localStorage.setItem('financeme-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded'); } catch { /* mode privat */ }
    return { sidebarCollapsed };
  }),
}));
