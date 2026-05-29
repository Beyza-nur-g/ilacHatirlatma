import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppCard, Button } from '../../src/components/UI';
import { InputField, SwitchRow } from '../../src/components/Form';
import { SelectField } from '../../src/components/SelectField';
import { DatePickerField } from '../../src/components/DateTimeFields';
import { genderOptions } from '../../src/constants/options';
import { useAuthStore } from '../../src/store/authStore';
import { borderRadius, spacing, typography } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';
import { Gender } from '../../src/models';

const splitValues = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const colors = theme.colors;
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    birth_date: '',
    gender: Gender.MALE,
    pregnancy_status: false,
    chronic_diseases: '',
    allergies: '',
    emergency_contact: '',
  });

  const handleRegister = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim() || !form.birth_date.trim()) return;
    setLoading(true);
    try {
      await register({
        ...form,
        chronic_diseases: splitValues(form.chronic_diseases),
        allergies: splitValues(form.allergies),
        emergency_contact: form.emergency_contact.trim() || undefined,
      });
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Yeni hesap olustur</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tek bir hesapla ilac, aile ve olcum takibini yonetin.</Text>
          </View>

          <AppCard style={styles.card}>
            <InputField label="Ad Soyad" placeholder="Ad Soyad" value={form.full_name} onChangeText={(value) => setForm((prev) => ({ ...prev, full_name: value }))} />
            <InputField
              label="E-posta"
              placeholder="ornek@email.com"
              value={form.email}
              onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <InputField
              label="Sifre"
              placeholder="En az 6 karakter"
              value={form.password}
              onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
              secureTextEntry
            />
            <DatePickerField
              label="Dogum tarihi"
              value={form.birth_date}
              onChange={(value) => setForm((prev) => ({ ...prev, birth_date: value }))}
              helper="Takvimden secilir, elle tarih yazmaya gerek yoktur."
            />
            <SelectField label="Cinsiyet" value={form.gender} options={genderOptions} onChange={(value) => setForm((prev) => ({ ...prev, gender: value as Gender }))} />
            {form.gender === Gender.FEMALE ? (
              <SwitchRow
                label="Hamilelik durumu"
                value={form.pregnancy_status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, pregnancy_status: value }))}
                helper="Ilac yorumlarinda baglamsal uyari icin kullanilir."
              />
            ) : null}
            <InputField
              label="Kronik hastaliklar"
              placeholder="Diyabet, Hipertansiyon"
              value={form.chronic_diseases}
              onChangeText={(value) => setForm((prev) => ({ ...prev, chronic_diseases: value }))}
              helper="Virgulle ayirin."
            />
            <InputField
              label="Alerjiler"
              placeholder="Penisilin, Polen"
              value={form.allergies}
              onChangeText={(value) => setForm((prev) => ({ ...prev, allergies: value }))}
              helper="Virgulle ayirin."
            />
            <InputField
              label="Acil iletisim"
              placeholder="05xx xxx xx xx"
              value={form.emergency_contact}
              onChangeText={(value) => setForm((prev) => ({ ...prev, emergency_contact: value }))}
            />
            <Button
              title="Kayit Ol"
              onPress={handleRegister}
              loading={loading}
              disabled={!form.full_name.trim() || !form.email.trim() || !form.password.trim() || !form.birth_date.trim()}
              fullWidth
            />
          </AppCard>

          <TouchableOpacity onPress={() => router.back()} style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Zaten hesabiniz var mi? </Text>
            <Text style={[styles.linkStrong, { color: colors.primary }]}>Giris yapin</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { gap: spacing.xs, marginTop: spacing.sm },
  title: { ...typography.h3 },
  subtitle: { ...typography.body2 },
  card: { gap: spacing.sm, borderRadius: borderRadius.xl },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.lg },
  linkText: { fontSize: 14 },
  linkStrong: { fontSize: 14, fontWeight: '700' },
});
