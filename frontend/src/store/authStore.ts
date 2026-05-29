import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Patient } from '../models';
import { authAPI, profileAPI } from '../services/api';
import { notifyError, notifyInfo, notifySuccess } from './uiStore';
import { registerPushTokenSafely, unregisterPushTokenSafely } from '../services/notifications';

interface AuthState {
  user: Patient | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<Patient>) => Promise<void>;
}

const persistAuth = async (accessToken: string, user: Patient) => {
  await AsyncStorage.multiSet([
    ['access_token', accessToken],
    ['user', JSON.stringify(user)],
  ]);
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email.trim(), password);
      await persistAuth(response.access_token, response.user);
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
      });
      notifySuccess('Giris basarili', `${response.user.full_name} hesabina giris yapildi.`);
      void registerPushTokenSafely();
    } catch (error: any) {
      notifyError('Giris basarisiz', error.message || 'Giris yapilamadi.');
      throw error;
    }
  },

  register: async (data: any) => {
    try {
      const response = await authAPI.register(data);
      await persistAuth(response.access_token, response.user);
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
      });
      notifySuccess('Kayit tamamlandi', 'Hesabiniz olusturuldu ve giris yapildi.');
      void registerPushTokenSafely();
    } catch (error: any) {
      notifyError('Kayit olusturulamadi', error.message || 'Kayit sirasinda hata olustu.');
      throw error;
    }
  },

  logout: async () => {
    await unregisterPushTokenSafely();
    await AsyncStorage.multiRemove(['access_token', 'user']);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    notifyInfo('Hesabindan cikildi', 'Tekrar gorusmek uzere.');
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const cachedUser = await AsyncStorage.getItem('user');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false, user: null, token: null });
        return;
      }

      set({ token });
      try {
        const user = await profileAPI.getProfile();
        await AsyncStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, isLoading: false });
        void registerPushTokenSafely();
      } catch (profileError) {
        if (cachedUser) {
          const user = JSON.parse(cachedUser) as Patient;
          set({ user, token, isAuthenticated: true, isLoading: false });
          void registerPushTokenSafely();
        } else {
          throw profileError;
        }
      }
    } catch {
      await AsyncStorage.multiRemove(['access_token', 'user']);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: async (data: Partial<Patient>) => {
    try {
      const updatedUser = await profileAPI.updateProfile(data);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
      notifySuccess('Profil guncellendi');
    } catch (error: any) {
      notifyError('Profil guncellenemedi', error.message || 'Profil guncellenemedi.');
      throw error;
    }
  },
}));
