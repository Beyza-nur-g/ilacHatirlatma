import { create } from 'zustand';
import { Measurement, MeasurementType } from '../models';
import { measurementAPI } from '../services/api';
import { notifyError, notifySuccess } from './uiStore';

export type { Measurement, MeasurementType };

interface MeasurementState {
  types: MeasurementType[];
  measurements: Measurement[];
  isLoading: boolean;
  fetchTypes: () => Promise<void>;
  addType: (data: Partial<MeasurementType>) => Promise<MeasurementType>;
  updateType: (id: string, data: Partial<MeasurementType>) => Promise<MeasurementType>;
  deleteType: (id: string) => Promise<void>;
  fetchMeasurements: (filters?: { member_id?: string; type_id?: string; from_date?: string; to_date?: string }) => Promise<void>;
  addMeasurement: (data: Partial<Measurement>) => Promise<Measurement>;
  updateMeasurement: (id: string, data: Partial<Measurement>) => Promise<Measurement>;
  deleteMeasurement: (id: string) => Promise<void>;
}

export const useMeasurementStore = create<MeasurementState>((set) => ({
  types: [],
  measurements: [],
  isLoading: false,

  fetchTypes: async () => {
    set({ isLoading: true });
    try {
      const types = await measurementAPI.getTypes();
      set({ types, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      notifyError('Olcum tipleri yuklenemedi', error.message);
      throw error;
    }
  },

  addType: async (data) => {
    try {
      const type = await measurementAPI.createType(data);
      set((state) => ({ types: [type, ...state.types] }));
      notifySuccess('Olcum tipi eklendi', `${type.name} olusturuldu.`);
      return type;
    } catch (error: any) {
      notifyError('Olcum tipi eklenemedi', error.message);
      throw error;
    }
  },

  updateType: async (id, data) => {
    try {
      const type = await measurementAPI.updateType(id, data);
      set((state) => ({ types: state.types.map((item) => (item.id === id ? type : item)) }));
      notifySuccess('Olcum tipi guncellendi', `${type.name} kaydedildi.`);
      return type;
    } catch (error: any) {
      notifyError('Olcum tipi guncellenemedi', error.message);
      throw error;
    }
  },

  deleteType: async (id) => {
    const typeName = useMeasurementStore.getState().types.find((item) => item.id === id)?.name || 'Olcum tipi';
    try {
      await measurementAPI.deleteType(id);
      set((state) => ({
        types: state.types.filter((item) => item.id !== id),
        measurements: state.measurements.filter((item) => item.measurement_type_id !== id),
      }));
      notifySuccess('Olcum tipi silindi', `${typeName} kaldirildi.`);
    } catch (error: any) {
      notifyError('Olcum tipi silinemedi', error.message);
      throw error;
    }
  },

  fetchMeasurements: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const measurements = await measurementAPI.getMeasurements(filters);
      set({ measurements, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      notifyError('Olcumler yuklenemedi', error.message);
      throw error;
    }
  },

  addMeasurement: async (data) => {
    try {
      const measurement = await measurementAPI.createMeasurement(data);
      set((state) => ({ measurements: [measurement, ...state.measurements] }));
      notifySuccess('Olcum kaydedildi');
      return measurement;
    } catch (error: any) {
      notifyError('Olcum eklenemedi', error.message);
      throw error;
    }
  },

  updateMeasurement: async (id, data) => {
    try {
      const measurement = await measurementAPI.updateMeasurement(id, data);
      set((state) => ({ measurements: state.measurements.map((item) => (item.id === id ? measurement : item)) }));
      notifySuccess('Olcum guncellendi');
      return measurement;
    } catch (error: any) {
      notifyError('Olcum guncellenemedi', error.message);
      throw error;
    }
  },

  deleteMeasurement: async (id) => {
    try {
      await measurementAPI.deleteMeasurement(id);
      set((state) => ({ measurements: state.measurements.filter((item) => item.id !== id) }));
      notifySuccess('Olcum silindi');
    } catch (error: any) {
      notifyError('Olcum silinemedi', error.message);
      throw error;
    }
  },
}));
