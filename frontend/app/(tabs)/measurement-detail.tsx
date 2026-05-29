import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, BottomSheet, Button, EmptyState, IconButton, SectionHeader } from '../../src/components/UI';
import { InputField } from '../../src/components/Form';
import { DateTimePickerField } from '../../src/components/DateTimeFields';
import { Measurement } from '../../src/models';
import { useActiveMemberStore } from '../../src/store/activeMemberStore';
import { useMeasurementStore } from '../../src/store/measurementStore';
import { spacing } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';

const emptyForm = {
  value: '',
  note: '',
  measured_at: '',
};

export default function MeasurementDetailScreen() {
  const theme = useAppTheme();
  const colors = theme.colors;
  const router = useRouter();
  const params = useLocalSearchParams<{ typeId?: string; action?: string }>();
  const typeId = params.typeId || '';
  const { activeMemberId, activeMemberName } = useActiveMemberStore();
  const { types, measurements, fetchTypes, fetchMeasurements, addMeasurement, updateMeasurement, deleteMeasurement } = useMeasurementStore();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(params.action === 'add');
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [typeId, activeMemberId]);

  const load = async () => {
    await Promise.all([fetchTypes(), fetchMeasurements({ member_id: activeMemberId || undefined, type_id: typeId })]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const measurementType = types.find((item) => item.id === typeId);
  const typeMeasurements = useMemo(
    () => measurements.filter((item) => item.measurement_type_id === typeId),
    [measurements, typeId],
  );

  const stats = useMemo(() => {
    if (!typeMeasurements.length) return { avg: 0, min: 0, max: 0 };
    const values = typeMeasurements.map((item) => item.value);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { avg, min: Math.min(...values), max: Math.max(...values) };
  }, [typeMeasurements]);

  const openCreate = () => {
    setEditingMeasurement(null);
    setForm({ value: '', note: '', measured_at: new Date().toISOString().slice(0, 16) });
    setSheetVisible(true);
  };

  const openEdit = (measurement: Measurement) => {
    setEditingMeasurement(measurement);
    setForm({
      value: String(measurement.value),
      note: measurement.note || '',
      measured_at: new Date(measurement.measured_at).toISOString().slice(0, 16),
    });
    setSheetVisible(true);
  };

  const handleSave = async () => {
    if (!typeId || !form.value.trim() || saving) return;
    const parsedDate = form.measured_at ? new Date(form.measured_at) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      Alert.alert('Gecersiz tarih', 'Lutfen tarih ve saati seciciden tekrar belirleyin.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        measurement_type_id: typeId,
        member_id: activeMemberId || undefined,
        value: Number(form.value),
        note: form.note.trim() || undefined,
        measured_at: parsedDate.toISOString(),
      };
      if (editingMeasurement) {
        await updateMeasurement(editingMeasurement.id, payload);
      } else {
        await addMeasurement(payload);
      }
      setSheetVisible(false);
      setEditingMeasurement(null);
      setForm(emptyForm);
      await fetchMeasurements({ member_id: activeMemberId || undefined, type_id: typeId });
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (measurement: Measurement) => {
    Alert.alert('Olcum silinsin mi?', `${measurement.value} ${measurementType?.unit || ''} kaydi kaldirilacak.`, [
      { text: 'Vazgec', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => deleteMeasurement(measurement.id) },
    ]);
  };

  if (!measurementType) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.notFoundText, { color: colors.textPrimary }]}>Olcum tipi bulunamadi.</Text>
          <Button title="Geri don" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const latest = typeMeasurements[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <IconButton icon="arrow-back" onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{measurementType.name}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{activeMemberName} profili · {measurementType.unit}</Text>
          </View>
          <Button title="Olcum ekle" size="sm" icon="add" onPress={openCreate} />
        </View>

        {latest ? (
          <AppCard style={styles.heroCard}>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Son deger</Text>
            <Text style={[styles.heroValue, { color: colors.textPrimary }]}>{latest.value} {measurementType.unit}</Text>
            <Text style={[styles.heroMeta, { color: colors.textSecondary }]}>{new Date(latest.measured_at).toLocaleString('tr-TR')}</Text>
          </AppCard>
        ) : null}

        {typeMeasurements.length === 0 ? (
          <EmptyState
            icon="bar-chart"
            title="Henuz olcum yok"
            description="Bu olcum tipi icin ilk degeri kaydedin."
            actionLabel="Olcum ekle"
            onAction={openCreate}
          />
        ) : (
          <>
            <View style={styles.statsGrid}>
              {[
                { label: 'Ortalama', value: stats.avg.toFixed(1) },
                { label: 'Min', value: String(stats.min) },
                { label: 'Maks', value: String(stats.max) },
              ].map((item) => (
                <AppCard key={item.label} style={styles.statCard}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{item.value}</Text>
                </AppCard>
              ))}
            </View>

            <SectionHeader title="Kayit gecmisi" subtitle={`${typeMeasurements.length} olcum kaydi`} />
            {typeMeasurements.map((measurement) => (
              <AppCard key={measurement.id} style={styles.measurementCard}>
                <View style={styles.measurementRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.measurementValue, { color: colors.textPrimary }]}>{measurement.value} {measurementType.unit}</Text>
                    <Text style={[styles.measurementMeta, { color: colors.textSecondary }]}>{new Date(measurement.measured_at).toLocaleString('tr-TR')}</Text>
                    {measurement.note ? <Text style={[styles.measurementNote, { color: colors.textSecondary }]}>{measurement.note}</Text> : null}
                  </View>
                  <View style={styles.inlineActions}>
                    <IconButton icon="create-outline" onPress={() => openEdit(measurement)} size="sm" />
                    <IconButton icon="trash-outline" onPress={() => askDelete(measurement)} size="sm" color={colors.error} />
                  </View>
                </View>
              </AppCard>
            ))}
          </>
        )}
      </ScrollView>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={editingMeasurement ? 'Olcumu duzenle' : 'Yeni olcum'}>
        <InputField label="Deger" placeholder={`Orn. 120 ${measurementType.unit}`} value={form.value} onChangeText={(value) => setForm((prev) => ({ ...prev, value: value.replace(/[^0-9.]/g, '') }))} keyboardType="decimal-pad" />
        <DateTimePickerField label="Olcum zamani" value={form.measured_at} onChange={(value) => setForm((prev) => ({ ...prev, measured_at: value }))} helper="Tarih ve saat sistem secicisiyle belirlenir." />
        <InputField label="Not" placeholder="Opsiyonel not" value={form.note} onChangeText={(value) => setForm((prev) => ({ ...prev, note: value }))} multiline />
        <View style={styles.sheetActions}>
          <Button title="Iptal" variant="ghost" onPress={() => setSheetVisible(false)} />
          <Button title={editingMeasurement ? 'Guncelle' : 'Kaydet'} onPress={handleSave} loading={saving} disabled={!form.value.trim() || saving} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 3 },
  heroCard: { gap: spacing.xs },
  heroLabel: { fontSize: 13, fontWeight: '600' },
  heroValue: { fontSize: 34, fontWeight: '700' },
  heroMeta: { fontSize: 12 },
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, gap: spacing.xs },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 22, fontWeight: '700' },
  measurementCard: { gap: spacing.sm },
  measurementRow: { flexDirection: 'row', gap: spacing.md },
  measurementValue: { fontSize: 18, fontWeight: '700' },
  measurementMeta: { fontSize: 12, marginTop: 3 },
  measurementNote: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  inlineActions: { flexDirection: 'row', gap: spacing.xs },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  notFoundText: { fontSize: 18, fontWeight: '700' },
});
