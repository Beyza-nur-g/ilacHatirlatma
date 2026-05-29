import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppCard, BottomSheet, Button, Chip, EmptyState, IconButton, SectionHeader } from '../../src/components/UI';
import { InputField } from '../../src/components/Form';
import { SelectField } from '../../src/components/SelectField';
import { MedicationCatalogPicker } from '../../src/components/MedicationCatalogPicker';
import { colorPalette, medicationShapeLabels, medicationShapeOptions } from '../../src/constants/options';
import {
  dosagePresetOptions,
  getMedicationCategoryLabel,
  medicationCatalog,
  MedicationCatalogItem,
  medicationCategoryOptions,
  usageInstructionOptions,
} from '../../src/constants/medicationCatalog';
import { Medication, MedicationShape } from '../../src/models';
import { useActiveMemberStore } from '../../src/store/activeMemberStore';
import { useMedicationStore } from '../../src/store/medicationStore';
import { spacing } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';

const emptyForm = {
  name: '',
  active_ingredient: '',
  dosage_text: '500 mg',
  usage_note: 'Doktorun belirttigi sekilde',
  barcode: '',
  shape: MedicationShape.TABLET,
  color: '#4A90E2',
  category: 'other',
};

const shapeIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  tablet: 'ellipse',
  capsule: 'git-commit',
  syrup: 'water',
  injection: 'fitness',
  cream: 'color-fill',
  drops: 'water-outline',
};

export default function MedicationsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const colors = theme.colors;
  const { activeMemberId, activeMemberName } = useActiveMemberStore();
  const { medications, isLoading, fetchMedications, addMedication, updateMedication, deleteMedication } = useMedicationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [manualNameVisible, setManualNameVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const filteredMedications = useMemo(
    () => medications.filter((item) => (activeMemberId ? item.member_id === activeMemberId : !item.member_id)),
    [activeMemberId, medications],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedications();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditingMedication(null);
    setForm(emptyForm);
    setManualNameVisible(false);
    setSheetVisible(true);
  };

  const openEdit = (medication: Medication) => {
    setEditingMedication(medication);
    setForm({
      name: medication.name,
      active_ingredient: medication.active_ingredient || '',
      dosage_text: medication.dosage_text || '500 mg',
      usage_note: medication.usage_note || 'Doktorun belirttigi sekilde',
      barcode: medication.barcode || '',
      shape: medication.appearance?.shape || MedicationShape.TABLET,
      color: medication.appearance?.color || '#4A90E2',
      category: medication.category || 'other',
    });
    setManualNameVisible(true);
    setSheetVisible(true);
  };

  const applyCatalogItem = (item: MedicationCatalogItem) => {
    setForm((prev) => ({
      ...prev,
      name: item.name,
      active_ingredient: item.active_ingredient,
      dosage_text: item.dosage_text,
      usage_note: item.usage_note,
      shape: item.shape,
      color: item.color,
      category: item.category,
    }));
    setManualNameVisible(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        member_id: activeMemberId || undefined,
        name: form.name.trim(),
        active_ingredient: form.active_ingredient.trim() || undefined,
        dosage_text: form.dosage_text.trim() || undefined,
        usage_note: form.usage_note.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        category: form.category,
        appearance: { shape: form.shape, color: form.color },
      };
      if (editingMedication) {
        await updateMedication(editingMedication.id, payload);
      } else {
        await addMedication(payload);
      }
      setSheetVisible(false);
      setEditingMedication(null);
      setManualNameVisible(false);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (medication: Medication) => {
    Alert.alert('Ilac silinsin mi?', `${medication.name} kaldirildiginda bagli hatirlaticilar da temizlenecek.`, [
      { text: 'Vazgec', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => deleteMedication(medication.id) },
    ]);
  };

  const selectedCatalogItem = medicationCatalog.find((item) => item.name === form.name);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <SectionHeader
          title="Ilaclar"
          subtitle={`${activeMemberName} profili icin kayitli ilaclar`}
          right={<Button title="Ilac ekle" size="sm" icon="add" onPress={openCreate} />}
        />

        {filteredMedications.length === 0 ? (
          <EmptyState
            icon="medical"
            title="Kayitli ilac yok"
            description="Ilac ekledikten sonra tek dokunusla hatirlatici olusturabilirsiniz."
            actionLabel="Ilk ilaci ekle"
            onAction={openCreate}
          />
        ) : (
          filteredMedications.map((medication) => (
            <AppCard key={medication.id} style={styles.card}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.shapePreview,
                    {
                      backgroundColor: medication.appearance?.color || colors.primary,
                      borderRadius: medication.appearance?.shape === MedicationShape.CAPSULE ? 999 : 18,
                    },
                  ]}
                >
                  <Ionicons name={shapeIconMap[medication.appearance?.shape || MedicationShape.TABLET]} size={24} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{medication.name}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>{medication.active_ingredient || 'Etken madde belirtilmedi'}</Text>
                  {medication.dosage_text ? <Text style={[styles.meta, { color: colors.textSecondary }]}>{medication.dosage_text}</Text> : null}
                </View>
                <View style={styles.actionRow}>
                  <IconButton icon="alarm-outline" onPress={() => router.push('/(tabs)/reminders')} size="sm" />
                  <IconButton icon="create-outline" onPress={() => openEdit(medication)} size="sm" />
                  <IconButton icon="trash-outline" onPress={() => askDelete(medication)} size="sm" color={colors.error} />
                </View>
              </View>

              <View style={styles.chipRow}>
                <Chip label={medicationShapeLabels[medication.appearance?.shape || MedicationShape.TABLET]} icon="medical" />
                <Chip label={getMedicationCategoryLabel(medication.category)} icon="apps" color={colors.secondary} />
                {medication.barcode ? <Chip label={`Barkod: ${medication.barcode}`} icon="barcode" color={colors.secondary} /> : null}
                <Chip label={activeMemberName} icon="person" color={colors.primary} />
              </View>

              {medication.usage_note ? <Text style={[styles.note, { color: colors.textSecondary }]}>{medication.usage_note}</Text> : null}
            </AppCard>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={editingMedication ? 'Ilaci duzenle' : 'Yeni ilac'}>
        <MedicationCatalogPicker
          label="Ilac adi"
          value={form.name}
          catalog={medicationCatalog}
          onSelect={applyCatalogItem}
          onManualPress={() => setManualNameVisible(true)}
        />

        {selectedCatalogItem && !manualNameVisible ? (
          <AppCard variant="outlined" style={styles.catalogPreview}>
            <View style={styles.previewRow}>
              <Ionicons name={selectedCatalogItem.icon as keyof typeof Ionicons.glyphMap} size={22} color={selectedCatalogItem.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>{selectedCatalogItem.name}</Text>
                <Text style={[styles.previewText, { color: colors.textSecondary }]}>{selectedCatalogItem.active_ingredient} · {selectedCatalogItem.dosage_text}</Text>
              </View>
              <Button title="Duzenle" size="sm" variant="outline" onPress={() => setManualNameVisible(true)} />
            </View>
          </AppCard>
        ) : null}

        {manualNameVisible ? (
          <>
            <InputField label="Manuel ilac adi" placeholder="Orn. Ilac adi" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} />
            <InputField label="Etken madde" placeholder="Orn. Parasetamol" value={form.active_ingredient} onChangeText={(value) => setForm((prev) => ({ ...prev, active_ingredient: value }))} />
          </>
        ) : null}

        <SelectField label="Kategori" value={form.category} options={medicationCategoryOptions} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} />
        <SelectField label="Doz" value={form.dosage_text} options={dosagePresetOptions} onChange={(value) => setForm((prev) => ({ ...prev, dosage_text: value }))} />
        <SelectField label="Kullanim talimati" value={form.usage_note} options={usageInstructionOptions} onChange={(value) => setForm((prev) => ({ ...prev, usage_note: value }))} />
        <SelectField label="Form" value={form.shape} options={medicationShapeOptions} onChange={(value) => setForm((prev) => ({ ...prev, shape: value as MedicationShape }))} />

        <View style={styles.paletteBlock}>
          <Text style={[styles.paletteTitle, { color: colors.textPrimary }]}>Gorunus rengi</Text>
          <View style={styles.paletteRow}>
            {colorPalette.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.paletteSwatch, { backgroundColor: color, borderColor: form.color === color ? colors.textPrimary : 'transparent' }]}
                onPress={() => setForm((prev) => ({ ...prev, color }))}
              />
            ))}
          </View>
        </View>

        <InputField label="Barkod" placeholder="Varsa barkod" value={form.barcode} onChangeText={(value) => setForm((prev) => ({ ...prev, barcode: value }))} />
        <Text style={[styles.safetyNote, { color: colors.textSecondary }]}>Liste hizli kayit icindir. Ilac, doz ve kullanim bilgisi doktor veya eczaci bilgisiyle dogrulanmalidir.</Text>
        <View style={styles.sheetActions}>
          <Button title="Iptal" variant="ghost" onPress={() => setSheetVisible(false)} />
          <Button title={editingMedication ? 'Guncelle' : 'Kaydet'} onPress={handleSave} loading={saving} disabled={!form.name.trim() || saving} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  shapePreview: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: spacing.xs },
  catalogPreview: { marginBottom: spacing.md, padding: spacing.sm },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewTitle: { fontSize: 14, fontWeight: '800' },
  previewText: { fontSize: 12, marginTop: 2 },
  paletteBlock: { marginBottom: spacing.md, marginTop: spacing.md },
  paletteTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paletteSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  safetyNote: { fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
});
