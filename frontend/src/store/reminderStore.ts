import { create } from 'zustand';
import { Reminder } from '../models';
import { remindersAPI } from '../services/api';
import { notifyError, notifyInfo, notifySuccess } from './uiStore';

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  fetchReminders: () => Promise<void>;
  addReminder: (data: Partial<Reminder>) => Promise<Reminder>;
  updateReminder: (id: string, data: Partial<Reminder>) => Promise<Reminder>;
  toggleReminder: (id: string) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set) => ({
  reminders: [],
  isLoading: false,

  fetchReminders: async () => {
    set({ isLoading: true });
    try {
      const reminders = await remindersAPI.getAll();
      set({ reminders, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      notifyError('Hatirlaticilar yuklenemedi', error.message);
      throw error;
    }
  },

  addReminder: async (data) => {
    try {
      const reminder = await remindersAPI.create(data);
      set((state) => ({ reminders: [reminder, ...state.reminders] }));
      notifySuccess('Hatirlatici eklendi', `${reminder.times.join(', ')} saatleri kaydedildi.`);
      return reminder;
    } catch (error: any) {
      notifyError('Hatirlatici eklenemedi', error.message);
      throw error;
    }
  },

  updateReminder: async (id, data) => {
    try {
      const updated = await remindersAPI.update(id, data);
      set((state) => ({ reminders: state.reminders.map((r) => (r.id === id ? updated : r)) }));
      notifySuccess('Hatirlatici guncellendi');
      return updated;
    } catch (error: any) {
      notifyError('Hatirlatici guncellenemedi', error.message);
      throw error;
    }
  },

  toggleReminder: async (id) => {
    try {
      const updated = await remindersAPI.toggle(id);
      set((state) => ({ reminders: state.reminders.map((r) => (r.id === id ? updated : r)) }));
      notifyInfo(updated.enabled ? 'Hatirlatici aktif' : 'Hatirlatici pasif', updated.enabled ? 'Bildirim tekrar acildi.' : 'Bildirim kapatildi.');
      return updated;
    } catch (error: any) {
      notifyError('Hatirlatici degistirilemedi', error.message);
      throw error;
    }
  },

  deleteReminder: async (id) => {
    try {
      await remindersAPI.delete(id);
      set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) }));
      notifySuccess('Hatirlatici silindi');
    } catch (error: any) {
      notifyError('Hatirlatici silinemedi', error.message);
      throw error;
    }
  },
}));
