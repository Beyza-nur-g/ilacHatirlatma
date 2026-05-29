import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppCard, Button, Chip } from '../../src/components/UI';
import { InputField } from '../../src/components/Form';
import { useAuthStore } from '../../src/store/authStore';
import { borderRadius, spacing, typography } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';
import { BASE_URL } from '../../src/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const colors = theme.colors;
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const networkHint = useMemo(() => {
    if (BASE_URL.includes('127.0.0.1') || BASE_URL.includes('localhost')) {
      return 'Gercek cihazda giris icin API adresini bilgisayarinizin yerel IP adresi ile guncelleyin.';
    }
    return 'API adresi tanimli. Backend ile ayni agda oldugunuzdan emin olun.';
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="medical" size={42} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Akilli Ilac Takip</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ilaclar, hatirlaticilar, aile profilleri ve olcumler tek yerde.</Text>
          </View>

          <AppCard style={styles.card}>
            <InputField
              label="E-posta"
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <InputField label="Sifre" placeholder="Sifrenizi girin" value={password} onChangeText={setPassword} secureTextEntry />

            <Button title="Giris Yap" onPress={handleLogin} loading={loading} disabled={!email.trim() || !password.trim()} fullWidth />

            <View style={styles.metaRow}>
              <Chip label={theme.name} icon="color-palette" />
              <Chip label="Mobil uyumlu" icon="phone-portrait" color={colors.secondary} />
            </View>
          </AppCard>

          <AppCard variant="outlined" style={styles.helperCard}>
            <Text style={[styles.helperTitle, { color: colors.textPrimary }]}>Baglanti ipucu</Text>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>Mevcut API: {BASE_URL}</Text>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>{networkHint}</Text>
          </AppCard>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Hesabiniz yok mu? </Text>
            <Text style={[styles.linkStrong, { color: colors.primary }]}>Kayit olun</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm },
  heroIcon: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h2, textAlign: 'center' },
  subtitle: { ...typography.body2, textAlign: 'center' },
  card: { gap: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm },
  helperCard: { gap: spacing.xs },
  helperTitle: { fontSize: 15, fontWeight: '700' },
  helperText: { fontSize: 13, lineHeight: 18 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkText: { fontSize: 14 },
  linkStrong: { fontSize: 14, fontWeight: '700' },
});
