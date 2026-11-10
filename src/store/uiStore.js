import { create } from 'zustand';

// State tampilan (bukan data keuangan) yang dipakai bersama oleh navigasi bawah,
// sidebar/drawer, dan form "Tambah Transaksi Cepat".
export const useUiStore = create((set) => ({
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  quickAddOpen: false,
  setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),
  transferOpen: false,
  setTransferOpen: (transferOpen) => set({ transferOpen }),
}));
