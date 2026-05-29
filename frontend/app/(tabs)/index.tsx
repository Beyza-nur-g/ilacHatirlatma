import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppCard, Button, Chip, EmptyState, SectionHeader } from '../../src/components/UI';
import { dashboardAPI, systemAPI } from '../../src/services/api';
import { DashboardSummary } from '../../src/models';
import { useAuthStore } from '../../src/store/authStore';
import { useActiveMemberStore } from '../../src/store/activeMemberStore';
import { useFamilyStore } from '../../src/store/familyStore';
import { borderRadius, spacing, typography } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';
import { notifyError } from '../../src/store/uiStore';

const quickActions = [
  { title: 'Yapay zeka sohbeti', subtitle: 'Ilaclar ve yonlendirme', icon: 'chatbubbles', route: '/(tabs)/chat' },
  { title: 'Ilac fotografi analizi', subtitle: 'Foto yukle ve yorum al', icon: 'camera', route: '/(tabs)/ocr' },
  { title: 'Profil ve tema', subtitle: 'Tema secimi ve hesap ayari', icon: 'person-circle', route: '/(tabs)/profile' },
];

export default function DashboardScreen() {
  const theme = useAppTheme();
  const colors = theme.colors;
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeMemberId, activeMemberName } = useActiveMemberStore();
  const { members, fetchMembers } = useFamilyStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [summaryData, health] = await Promise.all([dashboardAPI.getSummary(), systemAPI.health()]);
      setSummary(summaryData);
      setDatabaseStatus(health.database === 'ok' ? 'ok' : 'error');
      await fetchMembers();
    } catch (error: any) {
      notifyError('Panel yuklenemedi', error.message);
    }
  }, [fetchMembers]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const filteredDueDoses = useMemo(() => {
    if (!summary) return [];
    return summary.due_doses.filter((dose) => (activeMemberId ? dose.member_id === activeMemberId : !dose.member_id));
  }, [activeMemberId, summary]);

  const memberNameById = useMemo(() => Object.fromEntries(members.map((member) => [member.id, member.name])), [members]);

  const activeMemberCount = activeMemberId ? 1 : members.length + 1;
  const progress = summary?.today_total_dose_count ? Math.round((summary.today_taken_count / summary.today_total_dose_count) * 100) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Merhaba</Text>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>{user?.full_name || 'Kullanici'}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Aktif profil: {activeMemberName}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="person" size={26} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <Chip label={databaseStatus === 'ok' ? 'MongoDB baglandi' : databaseStatus === 'error' ? 'MongoDB hatasi' : 'Kontrol ediliyor'} icon={databaseStatus === 'ok' ? 'cloud-done' : 'cloud-offline'} color={databaseStatus === 'ok' ? colors.success : colors.error} />
          <Chip label={theme.name} icon="color-palette" color={colors.secondary} />
          <Chip label={`${activeMemberCount} profil`} icon="people" />
        </View>

        <AppCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>Gunluk ilac uyumu</Text>
              <Text style={[styles.progressMeta, { color: colors.textSecondary }]}>Bugun alinan doz: {summary?.today_taken_count ?? 0} / {summary?.today_total_dose_count ?? 0}</Text>
            </View>
            <View style={[styles.progressBadge, { backgroundColor: `${colors.primary}14` }]}>
              <Text style={[styles.progressBadgeText, { color: colors.primary }]}>{progress}%</Text>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.gray200 }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(progress, 100)}%` }]} />
          </View>
        </AppCard>

        <View style={styles.grid}>
          {[
            { icon: 'medical', label: 'Ilac', value: summary?.medication_count ?? 0 },
            { icon: 'alarm', label: 'Hatirlatici', value: summary?.active_reminder_count ?? 0 },
            { icon: 'fitness', label: 'Olcum', value: summary?.measurement_count ?? 0 },
            { icon: 'people', label: 'Aile', value: summary?.family_member_count ?? 0 },
          ].map((card) => (
            <AppCard key={card.label} style={styles.metricCard}>
              <Ionicons name={card.icon as any} size={22} color={colors.primary} />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{card.value}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{card.label}</Text>
            </AppCard>
          ))}
        </View>

        <SectionHeader title="Hizli erisim" subtitle="Chatbot, ilac analizi ve profil ayarlari" />
        <View style={styles.quickActionList}>
          {quickActions.map((item) => (
            <AppCard key={item.route} onPress={() => router.push(item.route as any)} style={styles.quickCard}>
              <View style={[styles.quickIcon, { backgroundColor: `${colors.primary}12` }]}>
                <Ionicons name={item.icon as any} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.quickSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </AppCard>
          ))}
        </View>

        <SectionHeader
          title="Yaklasan dozlar"
          subtitle={activeMemberId ? `${activeMemberName} icin planlanan dozlar` : 'Tum profillerde planlanan dozlar'}
          right={<Button title="Hatirlatici" onPress={() => router.push('/(tabs)/reminders')} size="sm" variant="outline" />}
        />

        {filteredDueDoses.length === 0 ? (
          <EmptyState icon="alarm-outline" title="Planlanan doz yok" description="Aktif profil icin yeni bir hatirlatici ekleyebilirsiniz." actionLabel="Hatirlatici ekle" onAction={() => router.push('/(tabs)/reminders')} />
        ) : (
          filteredDueDoses.map((dose) => (
            <AppCard key={`${dose.reminder_id}-${dose.time}`} style={styles.doseCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.doseName, { color: colors.textPrimary }]}>{dose.medication_name}</Text>
                  <Text style={[styles.doseMeta, { color: colors.textSecondary }]}>{dose.time} · {dose.member_id ? memberNameById[dose.member_id] || 'Aile profili' : 'Ben'}</Text>
                </View>
                <Chip label={dose.status === 'planned' ? 'Planlandi' : dose.status} />
              </View>
            </AppCard>
          ))
        )}

        <SectionHeader title="Son islemler" subtitle="Kullanicinin uygulama icindeki hareketleri" />
        {summary?.recent_activity?.length ? (
          summary.recent_activity.map((item) => (
            <AppCard key={item.id} style={styles.activityCard}>
              <View style={styles.rowBetween}>
                <Text style={[styles.activityMessage, { color: colors.textPrimary }]}>{item.message}</Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </AppCard>
          ))
        ) : (
          <AppCard style={styles.activityCard}>
            <Text style={[styles.activityMessage, { color: colors.textSecondary }]}>Henuz islem kaydi yok.</Text>
          </AppCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greeting: { ...typography.body2 },
  heroTitle: { ...typography.h3 },
  heroSubtitle: { ...typography.body2, marginTop: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  progressCard: { gap: spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  progressTitle: { fontSize: 16, fontWeight: '700' },
  progressMeta: { fontSize: 13 },
  progressBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.round },
  progressBadgeText: { fontSize: 18, fontWeight: '700' },
  progressBar: { height: 10, borderRadius: borderRadius.round, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: borderRadius.round },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricCard: { width: '47%', gap: 6 },
  metricValue: { fontSize: 28, fontWeight: '700' },
  metricLabel: { fontSize: 13, fontWeight: '600' },
  quickActionList: { gap: spacing.sm },
  quickCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  quickIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { fontSize: 15, fontWeight: '700' },
  quickSubtitle: { fontSize: 13, marginTop: 2 },
  doseCard: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  doseName: { fontSize: 15, fontWeight: '700' },
  doseMeta: { fontSize: 13, marginTop: 4 },
  activityCard: { paddingVertical: spacing.sm + 2 },
  activityMessage: { fontSize: 14, fontWeight: '600', flex: 1 },
  activityTime: { fontSize: 12 },
});
