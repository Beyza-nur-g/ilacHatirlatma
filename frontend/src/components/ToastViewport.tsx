import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, themePresets } from '../theme';
import { useUIStore } from '../store/uiStore';

const typeMeta = {
  success: { icon: 'checkmark-circle' as const },
  error: { icon: 'alert-circle' as const },
  info: { icon: 'information-circle' as const },
  warning: { icon: 'warning' as const },
};

export const ToastViewport = () => {
  const router = useRouter();
  const themeKey = useUIStore((state) => state.themeKey);
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);
  const colors = themePresets[themeKey].colors;

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.viewport}>
      {toasts.map((toast) => (
        <View key={toast.id} style={[styles.toast, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, shadowColor: colors.black }]}>
          <Ionicons name={typeMeta[toast.type].icon} size={20} color={toast.type === 'error' ? colors.error : toast.type === 'success' ? colors.success : colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.toastTitle, { color: colors.textPrimary }]}>{toast.title}</Text>
            {toast.message ? <Text style={[styles.toastMessage, { color: colors.textSecondary }]}>{toast.message}</Text> : null}
          </View>
          {toast.actionRoute && toast.actionLabel ? (
            <TouchableOpacity
              onPress={() => {
                removeToast(toast.id);
                router.push(toast.actionRoute as any);
              }}
            >
              <Text style={[styles.toastAction, { color: colors.primary }]}>{toast.actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    zIndex: 999,
    gap: 10,
  },
  toast: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  toastTitle: { fontSize: 14, fontWeight: '700' },
  toastMessage: { fontSize: 12, marginTop: 2 },
  toastAction: { fontSize: 13, fontWeight: '700' },
});
