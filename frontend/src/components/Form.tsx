import React from 'react';
import { StyleSheet, Switch, Text, TextInput, TextInputProps, View } from 'react-native';
import { borderRadius, spacing } from '../theme';
import { useThemeColors } from '../theme/useTheme';

export const InputField: React.FC<TextInputProps & { label?: string; helper?: string }> = ({ label, helper, multiline, style, ...props }) => {
  const colors = useThemeColors();
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text> : null}
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: colors.backgroundElevated,
            borderColor: colors.border,
            color: colors.textPrimary,
            minHeight: multiline ? 110 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
      {helper ? <Text style={[styles.helper, { color: colors.textSecondary }]}>{helper}</Text> : null}
    </View>
  );
};

export const SwitchRow: React.FC<{ label: string; value: boolean; onValueChange: (value: boolean) => void; helper?: string }> = ({ label, value, onValueChange, helper }) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.switchRow, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 2 }]}>{label}</Text>
        {helper ? <Text style={[styles.helper, { color: colors.textSecondary }]}>{helper}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary, false: colors.gray300 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '700' },
  helper: { fontSize: 12, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  switchRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
