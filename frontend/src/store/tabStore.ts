import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tab {
  id: string;
  title: string;
  path: string;
  active: boolean;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Omit<Tab, 'active'>) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      tabs: [],
      activeTabId: null,
      addTab: (tab) =>
        set((state) => {
          const exists = state.tabs.find((t) => t.path === tab.path);
          if (exists) {
            return { activeTabId: exists.id };
          }
          const newTab = { ...tab, active: true };
          return {
            tabs: [...state.tabs, newTab],
            activeTabId: tab.id,
          };
        }),
      removeTab: (id) =>
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== id);
          let newActiveTabId = state.activeTabId;
          if (state.activeTabId === id) {
            newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
          }
          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
          };
        }),
      setActiveTab: (id) => set({ activeTabId: id }),
    }),
    {
      name: 'app-tabs',
    }
  )
);
