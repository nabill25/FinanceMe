import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations } from '../lib/translations';

export const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: 'id',
      setLanguage: (lang) => set({ language: lang }),
      t: (key) => {
        const keys = key.split('.');
        let val = translations[get().language];
        for (const k of keys) {
          if (val) val = val[k];
        }
        return val || key;
      }
    }),
    {
      name: 'financeme-language',
    }
  )
);
