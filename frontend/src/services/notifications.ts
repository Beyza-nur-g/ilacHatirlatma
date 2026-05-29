import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationAPI } from './api';

const PUSH_TOKEN_STORAGE_KEY = 'expo_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});

const getProjectId = () => {
  // EAS projectId app.json extra.eas.projectId veya Constants.easConfig icinden gelebilir.
  // Bos ise eski Expo davranisiyla token alinmayi dener; hata olursa sessizce loglanir.
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as any).easConfig?.projectId ||
    undefined
  );
};

export const registerPushTokenSafely = async () => {
  try {
    if (Platform.OS === 'web') {
      return null;
    }
    if (!Device.isDevice) {
      console.info('[notifications] Fiziksel cihaz olmadigi icin push token alinmadi.');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medicine-reminders', {
        name: 'Ilac hatirlaticilari',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermission.status;
    if (finalStatus !== 'granted') {
      const requestedPermission = await Notifications.requestPermissionsAsync();
      finalStatus = requestedPermission.status;
    }
    if (finalStatus !== 'granted') {
      console.info('[notifications] Kullanici push bildirim izni vermedi.');
      return null;
    }

    const projectId = getProjectId();
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenResponse.data;

    await notificationAPI.registerDevice({
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_name: Device.deviceName || undefined,
      device_id: (Device as any).osInternalBuildId || undefined,
      app_version: Constants.expoConfig?.version,
    });
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expoPushToken);
    console.info('[notifications] Expo push token backend kaydina gonderildi.');
    return expoPushToken;
  } catch (error) {
    // Bildirim kaydi ana giris akisini bozmamali; sorun loglanir, uygulama kullanilmaya devam eder.
    console.warn('[notifications] Push token kaydi tamamlanamadi:', error);
    return null;
  }
};

export const unregisterPushTokenSafely = async () => {
  try {
    const expoPushToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (expoPushToken) {
      await notificationAPI.unregisterDevice(expoPushToken);
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('[notifications] Push token pasiflestirme tamamlanamadi:', error);
  }
};
