import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppCard, BottomSheet, Button, Chip, EmptyState, IconButton, SectionHeader } from '../../src/components/UI';
import { SwitchRow } from '../../src/components/Form';
import { DatePickerField, TimeListPicker } from '../../src/components/DateTimeFields';
import { SelectField } from '../../src/components/SelectField';
import { frequencyLabels, frequencyOptions, mealRuleLabels, mealRuleOptions, weekdayOptions } from '../../src/constants/options';
import { notifyBeforeOptions } from '../../src/constants/medicationCatalog';
import { Frequency, LogAction, MealRule, Reminder, Weekday } from '../../src/models';
import { useActiveMemberStore } from '../../src/store/activeMemberStore';
import { useLogStore } from '../../src/store/logStore';
import { useMedicationStore } from '../../src/store/medicationStore';
import { useReminderStore } from '../../src/store/reminderStore';
import { notificationAPI } from '../../src/services/api';
import { notifyError, notifyInfo, notifySuccess } from '../../src/store/uiStore';
import { spacing } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';

const emptyForm = {
  medication_id: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  times: ['08:00'] as string[],
  frequency: Frequency.DAILY,
  weekly_days: [] as Weekday[],
  notify_before_minutes: '15',
  meal_rule: MealRule.NONE,
  enabled: true,
};
export default function RemindersScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const colors = theme.colors;
  const { activeMemberId, activeMemberName } = useActiveMemberStore();
  const { medications, fetchMedications } = useMedicationStore();
  const { reminders, isLoading, fetchReminders, addReminder, updateReminder, toggleReminder, deleteReminder } = useReminderStore();
  const { todayLogs, fetchTodayLogs, createLog, isMedicationTakenToday } = useLogStore();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [activeMemberId]);

  const load = async () => {
    await Promise.all([fetchMedications(), fetchReminders(), fetchTodayLogs(activeMemberId || undefined)]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const medicationOptions = useMemo(
    () =>
      medications
        .filter((item) => (activeMemberId ? item.member_id === activeMemberId : !item.member_id))
        .map((item) => ({ label: item.name, value: item.id })),
    [activeMemberId, medications],
  );

  const filteredReminders = useMemo(
    () => reminders.filter((item) => (activeMemberId ? item.member_id === activeMemberId : !item.member_id)),
    [activeMemberId, reminders],
  );

  const openCreate = () => {
    setEditingReminder(null);
    setForm(emptyForm);
    setSheetVisible(true);
  };

  const openEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setForm({
      medication_id: reminder.medication_id,
      start_date: reminder.start_date,
      end_date: reminder.end_date || '',
      times: reminder.times.length ? reminder.times : ['08:00'],
      frequency: (reminder.frequency as Frequency) || Frequency.DAILY,
      weekly_days: (reminder.weekly_days || []) as Weekday[],
      notify_before_minutes: String(reminder.notify_before_minutes || 0),
      meal_rule: (reminder.meal_rule as MealRule) || MealRule.NONE,
      enabled: reminder.enabled,
    });
    setSheetVisible(true);
  };

  const handleSave = async () => {
    if (!form.medication_id || form.times.length === 0 || saving) return;
    setSaving(true);
    try {
      const payload = {
        member_id: activeMemberId || undefined,
        medication_id: form.medication_id,
        start_date: form.start_date,
        end_date: form.end_date.trim() || undefined,
        times: form.times,
        frequency: form.frequency,
        weekly_days: form.frequency === Frequency.WEEKLY ? form.weekly_days : undefined,
        notify_before_minutes: Number(form.notify_before_minutes || 0),
        meal_rule: form.meal_rule,
        enabled: form.enabled,
        timezone: 'Europe/Istanbul',
        family_notify: { enabled: false, member_ids: [] },
      };

      if (editingReminder) {
        await updateReminder(editingReminder.id, payload);
      } else {
        await addReminder(payload);
      }
      setSheetVisible(false);
      setEditingReminder(null);
      setForm(emptyForm);
      await fetchTodayLogs(activeMemberId || undefined);
    } finally {
      setSaving(false);
    }
  };

  const reminderMedicationName = (medicationId: string) => medications.find((item) => item.id === medicationId)?.name || 'Ilac';

  const getDoseStatus = (reminder: Reminder, time: string) => {
    if (isMedicationTakenToday(reminder.medication_id)) return 'taken';
    const now = new Date();
    const target = new Date();
    const [hour, minute] = time.split(':').map(Number);
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() < now.getTime()) return 'late';
    if (target.getTime() - now.getTime() <= 1000 * 60 * 30) return 'soon';
    return 'planned';
  };

  const statusColor = (status: string) => {
    if (status === 'taken') return colors.success;
    if (status === 'late') return colors.error;
    if (status === 'soon') return colors.warning;
    return colors.primary;
  };

  const registerAction = async (reminder: Reminder, time: string, action: LogAction, snoozeMinutes?: number) => {
    const scheduledAt = new Date(`${new Date().toISOString().slice(0, 10)}T${time}:00`).toISOString();
    await createLog({
      reminder_id: reminder.id,
      medication_id: reminder.medication_id,
      scheduled_at: scheduledAt,
      action,
      snooze_minutes: snoozeMinutes,
    });
    await fetchTodayLogs(activeMemberId || undefined);
  };

  const askDelete = (reminder: Reminder) => {
    Alert.alert('Hatirlatici silinsin mi?', `${reminderMedicationName(reminder.medication_id)} icin plan silinecek.`, [
      { text: 'Vazgec', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => deleteReminder(reminder.id) },
    ]);
  };

  const sendTestNotification = async () => {
    try {
      const result = await notificationAPI.sendTest('Akilli Ilac Hatirlatici', 'Bu bir test bildirimidir.');
      if (result.status === 'sent') {
        notifySuccess('Test bildirimi gonderildi', `${result.success_count} cihaza ulasti.`);
      } else {
        notifyInfo('Test bildirimi kayda alindi', result.error || 'Aktif cihaz tokeni yoksa bildirim atlanir.');
      }
    } catch (error: any) {
      notifyError('Test bildirimi gonderilemedi', error.message);
    }
  };

  const takenCount = todayLogs.filter((item) => item.action === LogAction.TAKEN).length;
  const totalDoseCount = filteredReminders.reduce((sum, item) => sum + item.times.length, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <SectionHeader
          title="Hatirlaticilar"
          subtitle={`${activeMemberName} icin bugun ${takenCount}/${totalDoseCount} doz tamamlandi`}
          right={
            <View style={styles.headerActions}>
              <Button title="Test" size="sm" variant="outline" icon="notifications" onPress={sendTestNotification} />
              <Button title="Yeni" size="sm" icon="add" onPress={openCreate} disabled={medicationOptions.length === 0} />
            </View>
          }
        />

        {medicationOptions.length === 0 ? (
          <AppCard style={styles.noticeCard}>
            <Text style={[styles.noticeTitle, { color: colors.textPrimary }]}>Once ilac ekleyin</Text>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>Hatirlatici olusturmak icin aktif profilde en az bir ilac bulunmali.</Text>
            <Button title="Ilaclar ekranina git" onPress={() => router.push('/(tabs)/medications' as any)} variant="outline" />
          </AppCard>
        ) : null}

        {filteredReminders.length === 0 ? (
          <EmptyState
            icon="alarm"
            title="Hatirlatici bulunmadi"
            description="Saat bazli plan olusturarak ilac takibini guclendirin."
            actionLabel={medicationOptions.length === 0 ? undefined : 'Ilk hatirlaticiyi ekle'}
            onAction={medicationOptions.length === 0 ? undefined : openCreate}
          />
        ) : (
          filteredReminders.map((reminder) => (
            <AppCard key={reminder.id} style={styles.reminderCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reminderName, { color: colors.textPrimary }]}>{reminderMedicationName(reminder.medication_id)}</Text>
                  <Text style={[styles.reminderMeta, { color: colors.textSecondary }]}>
                    {frequencyLabels[reminder.frequency] || reminder.frequency} · {mealRuleLabels[reminder.meal_rule] || reminder.meal_rule}
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  <IconButton icon={reminder.enabled ? 'pause-outline' : 'play-outline'} onPress={() => toggleReminder(reminder.id)} size="sm" />
                  <IconButton icon="create-outline" onPress={() => openEdit(reminder)} size="sm" />
                  <IconButton icon="trash-outline" onPress={() => askDelete(reminder)} size="sm" color={colors.error} />
                </View>
              </View>

              <View style={styles.chipWrap}>
                <Chip label={reminder.enabled ? 'Aktif' : 'Pasif'} color={reminder.enabled ? colors.success : colors.warning} />
                <Chip label={`Bildirim: ${reminder.notify_before_minutes} dk`} icon="notifications" />
                {reminder.frequency === Frequency.WEEKLY && reminder.weekly_days?.length ? <Chip label={reminder.weekly_days.join(', ')} icon="calendar" color={colors.secondary} /> : null}
              </View>

              <View style={styles.timeList}>
                {reminder.times.map((time) => {
                  const status = getDoseStatus(reminder, time);
                  return (
                    <View key={time} style={[styles.timeRow, { borderColor: colors.border }]}> 
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.timeText, { color: colors.textPrimary }]}>{time}</Text>
                        <Chip label={status === 'taken' ? 'Alindi' : status === 'late' ? 'Gecikti' : status === 'soon' ? 'Yaklasiyor' : 'Planli'} color={statusColor(status)} />
                      </View>
                      <View style={styles.timeActions}>
                        <Button title="Alindi" size="sm" onPress={() => registerAction(reminder, time, LogAction.TAKEN)} />
                        <Button title="Ertele" size="sm" variant="outline" onPress={() => registerAction(reminder, time, LogAction.SNOOZED, 10)} />
                        <Button title="Atla" size="sm" variant="ghost" onPress={() => registerAction(reminder, time, LogAction.SKIPPED)} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={editingReminder ? 'Hatirlaticiyi duzenle' : 'Yeni hatirlatici'}>
        <SelectField label="Ilac" value={form.medication_id} options={medicationOptions} onChange={(value) => setForm((prev) => ({ ...prev, medication_id: value }))} />
        <DatePickerField
          label="Baslangic tarihi"
          value={form.start_date}
          onChange={(value) => setForm((prev) => ({ ...prev, start_date: value }))}
          helper="Takvimden secilir, elle format yazmaya gerek yoktur."
        />
        <DatePickerField
          label="Bitis tarihi"
          value={form.end_date}
          placeholder="Opsiyonel"
          onChange={(value) => setForm((prev) => ({ ...prev, end_date: value }))}
          onClear={() => setForm((prev) => ({ ...prev, end_date: '' }))}
          helper="Bos birakilirsa hatirlatici suresiz devam eder."
        />
        <TimeListPicker
          label="Saatler"
          values={form.times}
          onChange={(values) => setForm((prev) => ({ ...prev, times: values.length ? values : ['08:00'] }))}
          helper="Saatler sistem secicisiyle eklenir; elle yazim hatasi engellenir."
        />
        <SelectField label="Siklik" value={form.frequency} options={frequencyOptions} onChange={(value) => setForm((prev) => ({ ...prev, frequency: value as Frequency }))} />
        {form.frequency === Frequency.WEEKLY ? (
          <View style={styles.weekdaySection}>
            <Text style={[styles.weekdayTitle, { color: colors.textPrimary }]}>Haftanin gunleri</Text>
            <View style={styles.chipWrap}>
              {weekdayOptions.map((item) => {
                const selected = form.weekly_days.includes(item.value as Weekday);
                return (
                  <Chip
                    key={item.value}
                    label={item.label}
                    color={selected ? colors.primary : colors.textSecondary}
                    variant={selected ? 'filled' : 'outlined'}
                    onPress={() =>
                      setForm((prev) => ({
                        ...prev,
                        weekly_days: selected
                          ? prev.weekly_days.filter((day) => day !== item.value)
                          : [...prev.weekly_days, item.value as Weekday],
                      }))
                    }
                  />
                );
              })}
            </View>
          </View>
        ) : null}
        <SelectField
          label="On bildirim"
          value={form.notify_before_minutes}
          options={notifyBeforeOptions}
          onChange={(value) => setForm((prev) => ({ ...prev, notify_before_minutes: value }))}
        />
        <SelectField label="Yemek kurali" value={form.meal_rule} options={mealRuleOptions} onChange={(value) => setForm((prev) => ({ ...prev, meal_rule: value as MealRule }))} />
        <SwitchRow label="Hatirlatici aktif" value={form.enabled} onValueChange={(value) => setForm((prev) => ({ ...prev, enabled: value }))} />
        <View style={styles.sheetActions}>
          <Button title="Iptal" variant="ghost" onPress={() => setSheetVisible(false)} />
          <Button title={editingReminder ? 'Guncelle' : 'Kaydet'} onPress={handleSave} loading={saving} disabled={!form.medication_id || form.times.length === 0 || saving} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  reminderCard: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  inlineActions: { flexDirection: 'row', gap: spacing.xs },
  headerActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  reminderName: { fontSize: 16, fontWeight: '700' },
  reminderMeta: { fontSize: 13, marginTop: 3 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeList: { gap: spacing.sm },
  timeRow: { borderWidth: 1, borderRadius: 16, padding: spacing.sm, gap: spacing.sm },
  timeText: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  timeActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  weekdaySection: { marginBottom: spacing.md },
  weekdayTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  noticeCard: { gap: spacing.sm },
  noticeTitle: { fontSize: 16, fontWeight: '700' },
  noticeText: { fontSize: 13, lineHeight: 18 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
});
