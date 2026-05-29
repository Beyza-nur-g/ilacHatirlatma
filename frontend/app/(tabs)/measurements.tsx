import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppCard, BottomSheet, Button, EmptyState, IconButton, SectionHeader } from '../../src/components/UI';
import { InputField } from '../../src/components/Form';
import { measurementTypePresets } from '../../src/constants/options';
import { MeasurementType } from '../../src/models';
import { useActiveMemberStore } from '../../src/store/activeMemberStore';
import { useMeasurementStore } from '../../src/store/measurementStore';
import { spacing } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';

const emptyForm = {
  name: '',
  unit: '',
  target_min: '',
  target_max: '',
  icon: 'fitness',
};

const iconOptions = ['fitness', 'water', 'heart', 'pulse', 'thermometer', 'scale', 'medical'];

export default function MeasurementsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const colors = theme.colors;
  const { activeMemberId, activeMemberName } = useActiveMemberStore();
  const { types, measurements, isLoading, fetchTypes, fetchMeasurements, addType, updateType, deleteType } = useMeasurementStore();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingType, setEditingType] = useState<MeasurementType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [activeMemberId]);

  const load = async () => {
    await Promise.all([fetchTypes(), fetchMeasurements({ member_id: activeMemberId || undefined })]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditingType(null);
    setForm(emptyForm);
    setSheetVisible(true);
  };

  const openEdit = (type: MeasurementType) => {
    setEditingType(type);
    setForm({
      name: type.name,
      unit: type.unit,
      target_min: type.target_min?.toString() || '',
      target_max: type.target_max?.toString() || '',
      icon: type.icon || 'fitness',
    });
    setSheetVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.unit.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim(),
        type: 'custom',
        icon: form.icon,
        target_min: form.target_min ? Number(form.target_min) : undefined,
        target_max: form.target_max ? Number(form.target_max) : undefined,
      };
      if (editingType) {
        await updateType(editingType.id, payload);
      } else {
        await addType(payload);
      }
      setSheetVisible(false);
      setEditingType(null);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (type: MeasurementType) => {
    Alert.alert('Olcum tipi silinsin mi?', `${type.name} ve bagli olcum kayitlari kaldirilacak.`, [
      { text: 'Vazgec', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => deleteType(type.id) },
    ]);
  };

  const latestByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    measurements.forEach((measurement) => {
      if (!(measurement.measurement_type_id in grouped)) {
        grouped[measurement.measurement_type_id] = measurement.value;
      }
    });
    return grouped;
  }, [measurements]);

  const countByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    measurements.forEach((measurement) => {
      grouped[measurement.measurement_type_id] = (grouped[measurement.measurement_type_id] || 0) + 1;
    });
    return grouped;
  }, [measurements]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <SectionHeader
          title="Olcum tipleri"
          subtitle={`${activeMemberName} profili icin takip alanlari`}
          right={<Button title="Yeni tip" size="sm" icon="add" onPress={openCreate} />}
        />

        {types.length === 0 ? (
          <>
            <EmptyState
              icon="fitness"
              title="Olcum tipi eklenmedi"
              description="Kan sekeri, tansiyon veya ozel bir olcum tanimlayabilirsiniz."
              actionLabel="Olcum tipi ekle"
              onAction={openCreate}
            />
            <SectionHeader title="Hazir setler" subtitle="Tek dokunusla yaygin olcum tiplerini ekleyin" />
            <View style={styles.presetGrid}>
              {measurementTypePresets.map((preset) => (
                <AppCard
                  key={preset.name}
                  onPress={async () => addType({ ...preset, type: 'custom' })}
                  style={styles.presetCard}
                >
                  <Ionicons name={preset.icon as any} size={24} color={colors.primary} />
                  <Text style={[styles.presetName, { color: colors.textPrimary }]}>{preset.name}</Text>
                  <Text style={[styles.presetMeta, { color: colors.textSecondary }]}>{preset.unit}</Text>
                </AppCard>
              ))}
            </View>
          </>
        ) : (
          types.map((type) => (
            <AppCard key={type.id} style={styles.typeCard}>
              <View style={styles.typeHeader}>
                <View style={[styles.typeIconWrap, { backgroundColor: `${colors.primary}16` }]}>
                  <Ionicons name={(type.icon || 'fitness') as any} size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeName, { color: colors.textPrimary }]}>{type.name}</Text>
                  <Text style={[styles.typeMeta, { color: colors.textSecondary }]}>
                    Son deger: {latestByType[type.id] ?? '-'} {type.unit} · {countByType[type.id] || 0} kayit
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  <IconButton icon="create-outline" onPress={() => openEdit(type)} size="sm" />
                  <IconButton icon="trash-outline" onPress={() => askDelete(type)} size="sm" color={colors.error} />
                </View>
              </View>

              {(type.target_min || type.target_max) ? (
                <Text style={[styles.targetText, { color: colors.textSecondary }]}>Hedef: {type.target_min ?? '-'} - {type.target_max ?? '-'} {type.unit}</Text>
              ) : null}

              <View style={styles.typeActions}>
                <Button title="Olcum ekle" size="sm" onPress={() => router.push(`/(tabs)/measurement-detail?typeId=${type.id}&action=add` as any)} />
                <Button title="Detay" size="sm" variant="outline" onPress={() => router.push(`/(tabs)/measurement-detail?typeId=${type.id}&action=view` as any)} />
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={editingType ? 'Olcum tipini duzenle' : 'Yeni olcum tipi'}>
        <InputField label="Ad" placeholder="Orn. Kan sekeri" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} />
        <InputField label="Birim" placeholder="mg/dL" value={form.unit} onChangeText={(value) => setForm((prev) => ({ ...prev, unit: value }))} />
        <View style={styles.iconSection}>
          <Text style={[styles.iconTitle, { color: colors.textPrimary }]}>Ikon</Text>
          <View style={styles.iconRow}>
            {iconOptions.map((icon) => (
              <TouchableOpacity key={icon} style={[styles.iconButton, { backgroundColor: form.icon === icon ? `${colors.primary}18` : colors.backgroundElevated, borderColor: form.icon === icon ? colors.primary : colors.border }]} onPress={() => setForm((prev) => ({ ...prev, icon }))}>
                <Ionicons name={icon as any} size={22} color={form.icon === icon ? colors.primary : colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <InputField label="Alt hedef" placeholder="Opsiyonel" value={form.target_min} onChangeText={(value) => setForm((prev) => ({ ...prev, target_min: value.replace(/[^0-9.]/g, '') }))} keyboardType="decimal-pad" />
        <InputField label="Ust hedef" placeholder="Opsiyonel" value={form.target_max} onChangeText={(value) => setForm((prev) => ({ ...prev, target_max: value.replace(/[^0-9.]/g, '') }))} keyboardType="decimal-pad" />
        <View style={styles.sheetActions}>
          <Button title="Iptal" variant="ghost" onPress={() => setSheetVisible(false)} />
          <Button title={editingType ? 'Guncelle' : 'Kaydet'} onPress={handleSave} loading={saving} disabled={!form.name.trim() || !form.unit.trim() || saving} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  presetCard: { width: '47%', gap: spacing.xs },
  presetName: { fontSize: 15, fontWeight: '700' },
  presetMeta: { fontSize: 12 },
  typeCard: { gap: spacing.md },
  typeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  typeIconWrap: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  typeName: { fontSize: 16, fontWeight: '700' },
  typeMeta: { fontSize: 13, marginTop: 3 },
  inlineActions: { flexDirection: 'row', gap: spacing.xs },
  targetText: { fontSize: 13 },
  typeActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  iconSection: { marginBottom: spacing.md },
  iconTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconButton: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
});
