import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { ToastViewport } from '../src/components/ToastViewport';
import { useUIStore } from '../src/store/uiStore';
import { useAppTheme } from '../src/theme/useTheme';

export default function AppLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const theme = useAppTheme();
  const hydrateUI = useUIStore((state) => state.hydrate);

  useEffect(() => {
    hydrateUI();
    loadUser();
  }, [hydrateUI, loadUser]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, router, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={theme.key === 'light' ? 'dark' : 'light'} />
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loaderText, { color: theme.colors.textSecondary }]}>Veriler hazirlaniyor...</Text>
            </View>
          ) : (
            <Slot />
          )}
          <ToastViewport />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
