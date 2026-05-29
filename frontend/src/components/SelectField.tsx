import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, spacing, themePresets } from '../theme';
import { useUIStore } from '../store/uiStore';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export const SelectField: React.FC<SelectFieldProps> = ({ label, placeholder = 'Seciniz', value, options, onChange }) => {
  const [visible, setVisible] = useState(false);
  const colors = themePresets[useUIStore((state) => state.themeKey)].colors;
  const selected = useMemo(() => options.find((item) => item.value === value), [options, value]);

  return (
    <View>
      {label ? <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text> : null}
      <TouchableOpacity style={[styles.field, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]} onPress={() => setVisible(true)} activeOpacity={0.85}>
        <Text style={{ color: selected ? colors.textPrimary : colors.textSecondary }}>{selected?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.backgroundElevated }]} onPress={() => undefined}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{label ?? placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{item.label}</Text>
                  {item.value === value ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600' },
  field: {
    minHeight: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.28)', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 20, paddingVertical: spacing.md, maxHeight: '70%' },
  sheetTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  option: { minHeight: 48, borderBottomWidth: 1, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center' },
});
