import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  ActivityEvent,
  ChatReply,
  DashboardSummary,
  FamilyMember,
  Measurement,
  MeasurementType,
  Medication,
  OCRAnalysis,
  Patient,
  Reminder,
  ReminderLog,
  DeviceRegistration,
  DeviceInfo,
  NotificationLog,
} from '../models';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8001').replace(/\/+$/, '');
const TIMEOUT = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 15000);

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['access_token', 'user']);
    }
    const detail = error.response?.data?.detail;
    const message = typeof detail === 'string'
      ? detail
      : error.code === 'ECONNABORTED'
      ? 'Sunucuya baglanti zaman asimina ugradi.'
      : error.message === 'Network Error'
      ? `Backend baglantisi kurulamadi. API adresini kontrol edin: ${BASE_URL}`
      : 'Beklenmeyen bir hata olustu.';
    return Promise.reject(new Error(message));
  }
);

const q = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.append(key, value);
  });
  const out = search.toString();
  return out ? `?${out}` : '';
};

export const systemAPI = {
  health: async () => (await api.get('/health')).data,
};

export const authAPI = {
  register: async (data: Record<string, any>) => (await api.post('/auth/register', data)).data,
  login: async (email: string, password: string) => (await api.post('/auth/login', { email, password })).data,
};

export const profileAPI = {
  getProfile: async (): Promise<Patient> => (await api.get('/profile')).data,
  updateProfile: async (data: Partial<Patient>): Promise<Patient> => (await api.put('/profile', data)).data,
};

export const familyAPI = {
  getAll: async (): Promise<FamilyMember[]> => (await api.get('/family')).data,
  create: async (data: Partial<FamilyMember>): Promise<FamilyMember> => (await api.post('/family', data)).data,
  update: async (id: string, data: Partial<FamilyMember>): Promise<FamilyMember> => (await api.put(`/family/${id}`, data)).data,
  delete: async (id: string) => api.delete(`/family/${id}`),
};

export const medicationsAPI = {
  getAll: async (): Promise<Medication[]> => (await api.get('/medications')).data,
  create: async (data: Partial<Medication>): Promise<Medication> => (await api.post('/medications', data)).data,
  update: async (id: string, data: Partial<Medication>): Promise<Medication> => (await api.put(`/medications/${id}`, data)).data,
  delete: async (id: string) => api.delete(`/medications/${id}`),
};

export const remindersAPI = {
  getAll: async (): Promise<Reminder[]> => (await api.get('/reminders')).data,
  create: async (data: Partial<Reminder>): Promise<Reminder> => (await api.post('/reminders', data)).data,
  update: async (id: string, data: Partial<Reminder>): Promise<Reminder> => (await api.put(`/reminders/${id}`, data)).data,
  toggle: async (id: string): Promise<Reminder> => (await api.post(`/reminders/${id}/toggle`)).data,
  delete: async (id: string) => api.delete(`/reminders/${id}`),
};

export const logsAPI = {
  getAll: async (fromDate?: string, toDate?: string, memberId?: string): Promise<ReminderLog[]> =>
    (await api.get(`/logs${q({ from_date: fromDate, to_date: toDate, member_id: memberId })}`)).data,
  create: async (data: Record<string, any>): Promise<ReminderLog> => (await api.post('/logs', data)).data,
};



export const notificationAPI = {
  registerDevice: async (data: DeviceRegistration): Promise<DeviceInfo> => (await api.post('/devices/register', data)).data,
  unregisterDevice: async (expoPushToken: string) => api.post('/devices/unregister', { expo_push_token: expoPushToken }),
  getDevices: async (): Promise<DeviceInfo[]> => (await api.get('/devices')).data,
  sendTest: async (title?: string, body?: string): Promise<NotificationLog> =>
    (await api.post('/notifications/test', { title: title || 'Akilli Ilac Hatirlatici', body: body || 'Test bildirimi basariyla gonderildi.' })).data,
  getLogs: async (): Promise<NotificationLog[]> => (await api.get('/notifications/logs')).data,
};

export const chatAPI = {
  send: async (text: string, member_id?: string, context?: Record<string, any>): Promise<ChatReply> =>
    (await api.post('/chat/send', { text, member_id, context })).data,
};

export const ocrAPI = {
  analyzeText: async (text: string, member_id?: string): Promise<OCRAnalysis> =>
    (await api.post('/ocr/analyze', { text, member_id })).data,
  uploadImage: async (file: { uri: string; type?: string; name?: string }, member_id?: string, extracted_text?: string): Promise<OCRAnalysis> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'medication.jpg',
    } as any);
    if (member_id) formData.append('member_id', member_id);
    if (extracted_text) formData.append('extracted_text', extracted_text);
    return (await api.post('/ocr/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
};

export const measurementAPI = {
  getTypes: async (): Promise<MeasurementType[]> => (await api.get('/measurements/types')).data,
  createType: async (data: Partial<MeasurementType>): Promise<MeasurementType> => (await api.post('/measurements/types', data)).data,
  updateType: async (id: string, data: Partial<MeasurementType>): Promise<MeasurementType> => (await api.put(`/measurements/types/${id}`, data)).data,
  deleteType: async (id: string) => api.delete(`/measurements/types/${id}`),
  getMeasurements: async (filters: { member_id?: string; type_id?: string; from_date?: string; to_date?: string } = {}): Promise<Measurement[]> =>
    (await api.get(`/measurements${q(filters)}`)).data,
  createMeasurement: async (data: Partial<Measurement>): Promise<Measurement> => (await api.post('/measurements', data)).data,
  updateMeasurement: async (id: string, data: Partial<Measurement>): Promise<Measurement> => (await api.put(`/measurements/${id}`, data)).data,
  deleteMeasurement: async (id: string) => api.delete(`/measurements/${id}`),
};

export const dashboardAPI = {
  getSummary: async (): Promise<DashboardSummary> => (await api.get('/dashboard')).data,
};

export const activityAPI = {
  getRecent: async (limit = 20): Promise<ActivityEvent[]> => (await api.get(`/activity${q({ limit: String(limit) })}`)).data,
};

export { BASE_URL, api };
export default api;
