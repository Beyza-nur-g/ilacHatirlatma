import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip } from './UI';
import { borderRadius, spacing } from '../theme';
import { useThemeColors } from '../theme/useTheme';

const pad = (value: number) => String(value).padStart(2, '0');

const dateFromValue = (value?: string) => {
  if (!value) return new Date();
  const parsed = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const timeFromValue = (value?: string) => {
  const date = new Date();
  const [hour = 8, minute = 0] = (value || '08:00').split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const dateTimeFromValue = (value?: string) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const formatDateDisplay = (date: Date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
const formatDateTimeLocal = (date: Date) => `${formatDate(date)}T${formatTime(date)}`;
const formatDateTimeDisplay = (date: Date) => `${formatDateDisplay(date)} ${formatTime(date)}`;

export const DatePickerField: React.FC<{
  label: string;
  value?: string;
  placeholder?: string;
  helper?: string;
  minimumDate?: Date;
  onChange: (value: string) => void;
  onClear?: () => void;
}> = ({ label, value, placeholder = 'Tarih sec', helper, minimumDate, onChange, onClear }) => {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const selectedDate = useMemo(() => dateFromValue(value), [value]);
  const displayValue = value ? formatDateDisplay(selectedDate) : placeholder;

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setVisible(false);
    if (date) onChange(formatDate(date));
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setVisible(true)}
        style={[styles.selector, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />

        <Text style={[styles.selectorText, { color: value ? colors.textPrimary : colors.textSecondary }]}>
          {displayValue}
        </Text>

        {onClear && value ? (
          <TouchableOpacity onPress={onClear}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {helper ? <Text style={[styles.helper, { color: colors.textSecondary }]}>{helper}</Text> : null}

      {visible ? (
        <View style={[styles.pickerPanel, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Secilen tarih</Text>
            <Text style={[styles.pickerValue, { color: colors.primary }]}>{formatDateDisplay(selectedDate)}</Text>
          </View>

          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={minimumDate}
            locale="tr-TR"
            style={styles.picker}
            onChange={handleChange}
          />

          {Platform.OS === 'ios' ? (
            <View style={styles.pickerActions}>
              <Button title="Tamam" variant="outline" onPress={() => setVisible(false)} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export const TimeListPicker: React.FC<{
  label: string;
  values: string[];
  helper?: string;
  onChange: (values: string[]) => void;
}> = ({ label, values, helper, onChange }) => {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempTime, setTempTime] = useState('08:00');

  const openPicker = (index: number | null) => {
    const initialTime = index === null ? '08:00' : values[index] || '08:00';

    setEditingIndex(index);
    setTempTime(initialTime);
    setVisible(true);
  };

  const upsertTime = (time: string) => {
    const nextValues = [...values];

    if (editingIndex === null) {
      if (!nextValues.includes(time)) nextValues.push(time);
    } else {
      nextValues[editingIndex] = time;
    }

    onChange([...new Set(nextValues)].sort());
  };

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date) return;

    const nextTime = formatTime(date);

    if (Platform.OS !== 'ios') {
      setVisible(false);
      upsertTime(nextTime);
      return;
    }

    setTempTime(nextTime);
  };

  const confirmTime = () => {
    upsertTime(tempTime);
    setVisible(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>

      <View style={styles.timeChips}>
        {values.map((time, index) => (
          <Chip
            key={`${time}-${index}`}
            label={time}
            icon="time-outline"
            onPress={() => openPicker(index)}
            onDelete={values.length > 1 ? () => onChange(values.filter((_, itemIndex) => itemIndex !== index)) : undefined}
          />
        ))}
      </View>

      <Button title="Saat ekle" variant="outline" icon="add" onPress={() => openPicker(null)} />

      {helper ? <Text style={[styles.helper, { color: colors.textSecondary }]}>{helper}</Text> : null}

      {visible ? (
        <View style={[styles.pickerPanel, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Secilen saat</Text>
            <Text style={[styles.pickerValue, { color: colors.primary }]}>{tempTime}</Text>
          </View>

          <DateTimePicker
            value={timeFromValue(tempTime)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            locale="tr-TR"
            style={styles.picker}
            onChange={handleChange}
          />

          {Platform.OS === 'ios' ? (
            <View style={styles.pickerActions}>
              <Button title="Tamam" variant="outline" onPress={confirmTime} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export const DateTimePickerField: React.FC<{
  label: string;
  value?: string;
  placeholder?: string;
  helper?: string;
  onChange: (value: string) => void;
}> = ({ label, value, placeholder = 'Tarih ve saat sec', helper, onChange }) => {
  const colors = useThemeColors();
  const [dateVisible, setDateVisible] = useState(false);
  const [timeVisible, setTimeVisible] = useState(false);
  const selectedDateTime = useMemo(() => dateTimeFromValue(value), [value]);
  const displayValue = value ? formatDateTimeDisplay(selectedDateTime) : placeholder;

  const applyDate = (nextDate: Date) => {
    const merged = new Date(selectedDateTime);
    merged.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
    onChange(formatDateTimeLocal(merged));
  };

  const applyTime = (nextDate: Date) => {
    const merged = new Date(selectedDateTime);
    merged.setHours(nextDate.getHours(), nextDate.getMinutes(), 0, 0);
    onChange(formatDateTimeLocal(merged));
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setDateVisible(false);
    if (date) applyDate(date);
  };

  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setTimeVisible(false);
    if (date) applyTime(date);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>

      <View style={[styles.selector, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
        <Ionicons name="calendar-number-outline" size={20} color={colors.primary} />
        <Text style={[styles.selectorText, { color: value ? colors.textPrimary : colors.textSecondary }]}>
          {displayValue}
        </Text>
      </View>

      <View style={styles.inlineButtons}>
        <Button title="Tarih sec" variant="outline" icon="calendar-outline" onPress={() => setDateVisible(true)} />
        <Button title="Saat sec" variant="outline" icon="time-outline" onPress={() => setTimeVisible(true)} />
      </View>

      {helper ? <Text style={[styles.helper, { color: colors.textSecondary }]}>{helper}</Text> : null}

      {dateVisible ? (
        <View style={[styles.pickerPanel, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Secilen tarih</Text>
            <Text style={[styles.pickerValue, { color: colors.primary }]}>{formatDateDisplay(selectedDateTime)}</Text>
          </View>

          <DateTimePicker
            value={selectedDateTime}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="tr-TR"
            style={styles.picker}
            onChange={handleDateChange}
          />

          {Platform.OS === 'ios' ? (
            <View style={styles.pickerActions}>
              <Button title="Tamam" variant="outline" onPress={() => setDateVisible(false)} />
            </View>
          ) : null}
        </View>
      ) : null}

      {timeVisible ? (
        <View style={[styles.pickerPanel, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Secilen saat</Text>
            <Text style={[styles.pickerValue, { color: colors.primary }]}>{formatTime(selectedDateTime)}</Text>
          </View>

          <DateTimePicker
            value={selectedDateTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            locale="tr-TR"
            style={styles.picker}
            onChange={handleTimeChange}
          />

          {Platform.OS === 'ios' ? (
            <View style={styles.pickerActions}>
              <Button title="Tamam" variant="outline" onPress={() => setTimeVisible(false)} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
  },

  selector: {
    minHeight: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  selectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },

  helper: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
  },

  pickerPanel: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },

  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  pickerValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  picker: {
    alignSelf: 'stretch',
  },

  pickerActions: {
    marginTop: spacing.sm,
    alignItems: 'flex-end',
  },

  inlineButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },

  timeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
