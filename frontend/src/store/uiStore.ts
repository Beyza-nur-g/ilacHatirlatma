import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { ThemeKey } from '../theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  actionLabel?: string;
  actionRoute?: string;
}

interface UIState {
  themeKey: ThemeKey;
  toasts: ToastItem[];
  hydrated: boolean;
  setTheme: (themeKey: ThemeKey) => void;
  hydrate: () => Promise<void>;
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  themeKey: 'light',
  toasts: [],
  hydrated: false,
  setTheme: (themeKey) => {
    AsyncStorage.setItem('theme_key', themeKey).catch(() => undefined);
    set({ themeKey });
  },
  hydrate: async () => {
    const themeKey = (await AsyncStorage.getItem('theme_key')) as ThemeKey | null;
    set({ themeKey: themeKey || 'light', hydrated: true });
  },
  pushToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      useUIStore.getState().removeToast(id);
    }, 3800);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

export const notifySuccess = (title: string, message?: string, actionRoute?: string, actionLabel?: string) =>
  useUIStore.getState().pushToast({ title, message, type: 'success', actionRoute, actionLabel });

export const notifyError = (title: string, message?: string) =>
  useUIStore.getState().pushToast({ title, message, type: 'error' });

export const notifyInfo = (title: string, message?: string, actionRoute?: string, actionLabel?: string) =>
  useUIStore.getState().pushToast({ title, message, type: 'info', actionRoute, actionLabel });
