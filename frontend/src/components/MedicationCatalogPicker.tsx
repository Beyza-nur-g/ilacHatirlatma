import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicationCatalogItem, medicationCategoryOptions } from '../constants/medicationCatalog';
import { borderRadius, spacing } from '../theme';
import { useThemeColors } from '../theme/useTheme';

interface MedicationCatalogPickerProps {
  label: string;
  value?: string;
  catalog: MedicationCatalogItem[];
  onSelect: (item: MedicationCatalogItem) => void;
  onManualPress: () => void;
}

export const MedicationCatalogPicker: React.FC<MedicationCatalogPickerProps> = ({ label, value, catalog, onSelect, onManualPress }) => {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const selected = useMemo(() => catalog.find((item) => item.name === value), [catalog, value]);
  const filteredCatalog = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    return catalog.filter((item) => {
      const categoryMatches = category === 'all' || item.category === category;
      const queryMatches =
        !normalizedQuery ||
        item.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        item.active_ingredient.toLocaleLowerCase('tr-TR').includes(normalizedQuery);
      return categoryMatches && queryMatches;
    });
  }, [catalog, category, query]);

  const chooseItem = (item: MedicationCatalogItem) => {
    onSelect(item);
    setVisible(false);
    setQuery('');
    setCategory('all');
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.selector, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
        onPress={() => setVisible(true)}
      >
        <View style={[styles.leadingIcon, { backgroundColor: `${colors.primary}18` }]}> 
          <Ionicons name={(selected?.icon as keyof typeof Ionicons.glyphMap) || 'medical-outline'} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.selectorTitle, { color: value ? colors.textPrimary : colors.textSecondary }]}>{value || 'Listeden ilac sec'}</Text>
          <Text style={[styles.selectorMeta, { color: colors.textSecondary }]}>{selected?.active_ingredient || 'Hizli secim, kategori ve arama destekli'}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.backgroundElevated }]} onPress={() => undefined}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Ilac listesinden sec</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>Bu liste hizli giris icindir; dozu doktor/eczaci bilgisine gore kontrol edin.</Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={[styles.closeButton, { borderColor: colors.border }]}> 
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}> 
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ilac veya etken madde ara"
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {[{ label: '✨ Tumu', value: 'all', icon: 'apps-outline' }, ...medicationCategoryOptions].map((item) => {
                const selectedCategory = category === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selectedCategory ? `${colors.primary}18` : colors.background,
                        borderColor: selectedCategory ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategory(item.value)}
                  >
                    <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={14} color={selectedCategory ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.categoryText, { color: selectedCategory ? colors.primary : colors.textSecondary }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <FlatList
              data={filteredCatalog}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>Uygun kayit bulunamadi. Manuel giris kullanabilirsiniz.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.resultRow, { borderBottomColor: colors.border }]} onPress={() => chooseItem(item)} activeOpacity={0.85}>
                  <View style={[styles.resultIcon, { backgroundColor: `${item.color}18` }]}> 
                    <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>{item.active_ingredient} · {item.dosage_text}</Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={[styles.manualButton, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}
              onPress={() => {
                setVisible(false);
                onManualPress();
              }}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={[styles.manualText, { color: colors.primary }]}>Listede yok, manuel ad gir</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '700' },
  selector: {
    minHeight: 58,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  leadingIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  selectorTitle: { fontSize: 15, fontWeight: '700' },
  selectorMeta: { fontSize: 12, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.28)', justifyContent: 'center', padding: 18 },
  sheet: { borderRadius: 24, padding: spacing.md, maxHeight: '86%' },
  sheetHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.md },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetSubtitle: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  closeButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchBox: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', minHeight: 46, gap: spacing.sm },
  searchInput: { flex: 1, fontSize: 14 },
  categoryRow: { gap: spacing.sm, paddingVertical: spacing.md },
  categoryChip: { borderWidth: 1, borderRadius: borderRadius.round, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  resultRow: { minHeight: 64, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  resultIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 15, fontWeight: '800' },
  resultMeta: { fontSize: 12, marginTop: 3 },
  emptyText: { textAlign: 'center', paddingVertical: spacing.lg, fontSize: 13 },
  manualButton: { borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  manualText: { fontSize: 14, fontWeight: '800' },
});
