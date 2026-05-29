import { create } from 'zustand';
import { isToday } from 'date-fns';
import { LogAction, ReminderLog } from '../models';
import { logsAPI } from '../services/api';
import { notifyError, notifyInfo, notifySuccess } from './uiStore';

interface LogState {
  logs: ReminderLog[];
  todayLogs: ReminderLog[];
  isLoading: boolean;
  fetchLogs: (fromDate?: string, toDate?: string, memberId?: string) => Promise<void>;
  fetchTodayLogs: (memberId?: string) => Promise<void>;
  createLog: (data: {
    reminder_id: string;
    medication_id: string;
    scheduled_at: string;
    action: LogAction;
    snooze_minutes?: number;
  }) => Promise<ReminderLog>;
  getTodayTakenCount: () => number;
  isMedicationTakenToday: (medicationId: string, time?: string) => boolean;
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  todayLogs: [],
  isLoading: false,

  fetchLogs: async (fromDate, toDate, memberId) => {
    set({ isLoading: true });
    try {
      const logs = await logsAPI.getAll(fromDate, toDate, memberId);
      set({ logs, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      notifyError('Kayitlar yuklenemedi', error.message);
      throw error;
    }
  },

  fetchTodayLogs: async (memberId) => {
    set({ isLoading: true });
    try {
      const today = new Date().toISOString().slice(0, 10);
      const logs = await logsAPI.getAll(today, today, memberId);
      set({ todayLogs: logs, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      notifyError('Bugun kayitlari yuklenemedi', error.message);
      throw error;
    }
  },

  createLog: async (data) => {
    try {
      const log = await logsAPI.create(data);
      set((state) => ({
        logs: [log, ...state.logs],
        todayLogs: isToday(new Date(data.scheduled_at)) ? [log, ...state.todayLogs] : state.todayLogs,
      }));
      if (data.action === LogAction.TAKEN) {
        notifySuccess('Ilaciniz alindi');
      } else if (data.action === LogAction.SKIPPED) {
        notifyInfo('Doz atlandi');
      } else if (data.action === LogAction.SNOOZED) {
        notifyInfo('Hatirlatma ertelendi', `${data.snooze_minutes || 10} dakika sonra tekrar hatirlatilacak.`);
      } else {
        notifyInfo('Doz kacirildi olarak kaydedildi');
      }
      return log;
    } catch (error: any) {
      notifyError('Islem kaydedilemedi', error.message);
      throw error;
    }
  },

  getTodayTakenCount: () => get().todayLogs.filter((log) => log.action === LogAction.TAKEN).length,

  isMedicationTakenToday: (medicationId, _time) =>
    get().todayLogs.some((log) => {
      // Kullanicinin ayni gun icinde ilgili ilaci aldigini isaretlemesi,
      // ekrandaki gecikti durumunun alindi olarak guncellenmesi icin yeterlidir.
      return log.medication_id === medicationId && log.action === LogAction.TAKEN;
    }),
}));
