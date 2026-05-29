import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, Button, Chip, IconButton, SectionHeader } from '../../src/components/UI';
import { InputField, SwitchRow } from '../../src/components/Form';
import { SelectField } from '../../src/components/SelectField';
import { DatePickerField } from '../../src/components/DateTimeFields';
import { genderOptions } from '../../src/constants/options';
import { Gender } from '../../src/models';
import { BASE_URL } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { useUIStore } from '../../src/store/uiStore';
import { spacing, themePresets } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';

const splitValues = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const colors = theme.colors;
  const themeKey = useUIStore((state) => state.themeKey);
  const setTheme = useUIStore((state) => state.setTheme);
  const { user, updateUser, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    birth_date: user?.birth_date || '',
    gender: (user?.gender as Gender) || Gender.OTHER,
    pregnancy_status: user?.pregnancy_status || false,
    chronic_diseases: user?.chronic_diseases?.join(', ') || '',
    allergies: user?.allergies?.join(', ') || '',
    emergency_contact: user?.emergency_contact || '',
  });

  const themeOptions = useMemo(() => Object.values(themePresets), []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUser({
        full_name: form.full_name.trim(),
        birth_date: form.birth_date.trim(),
        gender: form.gender,
        pregnancy_status: form.pregnancy_status,
        chronic_diseases: splitValues(form.chronic_diseases),
        allergies: splitValues(form.allergies),
        emergency_contact: form.emergency_contact.trim() || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
            <IconButton icon="arrow-back" onPress={() => router.back()} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Profil ve ayarlar</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>
        </View>

        <AppCard style={styles.heroCard}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="person" size={34} color={colors.primary} />
          </View>
          <Text style={[styles.heroName, { color: colors.textPrimary }]}>{user?.full_name}</Text>
          <View style={styles.heroChips}>
            <Chip label={theme.name} icon="color-palette" />
            <Chip label="Bildirimli izleme" icon="notifications" color={colors.secondary} />
          </View>
        </AppCard>

        <SectionHeader title="Tema secimi" subtitle="Tum uygulamada aninda uygulanir" />
        <View style={styles.themeRow}>
          {themeOptions.map((item) => (
            <AppCard key={item.key} onPress={() => setTheme(item.key)} style={[styles.themeCard, themeKey === item.key && { borderColor: item.colors.primary, borderWidth: 1 }]}>
              <View style={styles.swatchRow}>
                <View style={[styles.swatch, { backgroundColor: item.colors.primary }]} />
                <View style={[styles.swatch, { backgroundColor: item.colors.secondary }]} />
                <View style={[styles.swatch, { backgroundColor: item.colors.background }]} />
              </View>
              <Text style={[styles.themeName, { color: colors.textPrimary }]}>{item.name}</Text>
            </AppCard>
          ))}
        </View>

        <SectionHeader title="Hesap bilgileri" subtitle="Veritabaninda saklanan temel kullanici bilgileri" />
        <AppCard style={styles.formCard}>
          <InputField label="Ad Soyad" value={form.full_name} onChangeText={(value) => setForm((prev) => ({ ...prev, full_name: value }))} />
          <DatePickerField label="Dogum tarihi" value={form.birth_date} onChange={(value) => setForm((prev) => ({ ...prev, birth_date: value }))} helper="Takvimden secilir, elle tarih yazmaya gerek yoktur." />
          <SelectField label="Cinsiyet" value={form.gender} options={genderOptions} onChange={(value) => setForm((prev) => ({ ...prev, gender: value as Gender }))} />
          {form.gender === Gender.FEMALE ? <SwitchRow label="Hamilelik durumu" value={form.pregnancy_status} onValueChange={(value) => setForm((prev) => ({ ...prev, pregnancy_status: value }))} /> : null}
          <InputField label="Kronik hastaliklar" value={form.chronic_diseases} onChangeText={(value) => setForm((prev) => ({ ...prev, chronic_diseases: value }))} helper="Virgulle ayirin." />
          <InputField label="Alerjiler" value={form.allergies} onChangeText={(value) => setForm((prev) => ({ ...prev, allergies: value }))} helper="Virgulle ayirin." />
          <InputField label="Acil iletisim" value={form.emergency_contact} onChangeText={(value) => setForm((prev) => ({ ...prev, emergency_contact: value }))} />
          <Button title="Kaydet" onPress={handleSave} loading={loading} fullWidth />
        </AppCard>

        <SectionHeader title="Sistem bilgisi" subtitle="Expo ve backend baglanti ozetiniz" />
        <AppCard style={styles.infoCard}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>API adresi: {BASE_URL}</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>Gercek cihaz kullanirken bu adresin bilgisayarinizin yerel IP adresi olmasi gerekir.</Text>
        </AppCard>

        <Button title="Cikis Yap" variant="danger" onPress={async () => { await logout(); router.replace('/(auth)/login'); }} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 3 },
  heroCard: { alignItems: 'center', gap: spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroName: { fontSize: 22, fontWeight: '700' },
  heroChips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  themeRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  themeCard: { width: '30%', gap: spacing.sm },
  swatchRow: { flexDirection: 'row', gap: 6 },
  swatch: { width: 18, height: 18, borderRadius: 9 },
  themeName: { fontSize: 13, fontWeight: '700' },
  formCard: { gap: spacing.sm },
  infoCard: { gap: spacing.xs },
  infoText: { fontSize: 13, lineHeight: 18 },
});
