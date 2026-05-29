import { create } from 'zustand';
import { Medication } from '../models';
import { medicationsAPI } from '../services/api';
import { notifyError, notifySuccess } from './uiStore';

interface MedicationState {
  medications: Medication[];
  isLoading: boolean;
  fetchMedications: () => Promise<void>;
  addMedication: (data: Partial<Medication>) => Promise<Medication>;
  updateMedication: (id: string, data: Partial<Medication>) => Promise<Medication>;
  deleteMedication: (id: string) => Promise<void>;
}

export const useMedicationStore = create<MedicationState>((set) => ({
  medications: [],
  isLoading: false,

  fetchMedications: async () => {
    set({ isLoading: true });
    try {
      const medications = await medicationsAPI.getAll();
      set({ medications, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      notifyError('Ilaclar yuklenemedi', error.message);
      throw error;
    }
  },

  addMedication: async (data) => {
    try {
      const medication = await medicationsAPI.create(data);
      set((state) => ({ medications: [medication, ...state.medications] }));
      notifySuccess('Ilaciniz eklendi', 'Hatilatici eklemek ister misiniz?', '/(tabs)/reminders', 'Hatirlatici ekle');
      return medication;
    } catch (error: any) {
      notifyError('Ilac eklenemedi', error.message);
      throw error;
    }
  },

  updateMedication: async (id, data) => {
    try {
      const updated = await medicationsAPI.update(id, data);
      set((state) => ({ medications: state.medications.map((m) => (m.id === id ? updated : m)) }));
      notifySuccess('Ilac guncellendi', `${updated.name} kaydedildi.`);
      return updated;
    } catch (error: any) {
      notifyError('Ilac guncellenemedi', error.message);
      throw error;
    }
  },

  deleteMedication: async (id) => {
    const name = useMedicationStore.getState().medications.find((item) => item.id === id)?.name || 'Ilac';
    try {
      await medicationsAPI.delete(id);
      set((state) => ({ medications: state.medications.filter((m) => m.id !== id) }));
      notifySuccess('Ilaciniz silindi', `${name} kaldirildi.`);
    } catch (error: any) {
      notifyError('Ilac silinemedi', error.message);
      throw error;
    }
  },
}));
