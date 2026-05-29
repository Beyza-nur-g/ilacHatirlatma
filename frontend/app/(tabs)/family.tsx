import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, BottomSheet, Button, Chip, EmptyState, IconButton, SectionHeader } from '../../src/components/UI';
import { InputField } from '../../src/components/Form';
import { SelectField } from '../../src/components/SelectField';
import { DatePickerField } from '../../src/components/DateTimeFields';
import { relationLabels, relationOptions } from '../../src/constants/options';
import { FamilyMember, Relation } from '../../src/models';
import { useActiveMemberStore } from '../../src/store/activeMemberStore';
import { useFamilyStore } from '../../src/store/familyStore';
import { borderRadius, spacing, typography } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';

const emptyForm = {
  name: '',
  relation: Relation.OTHER,
  birth_date: '',
  note: '',
};

export default function FamilyScreen() {
  const theme = useAppTheme();
  const colors = theme.colors;
  const { members, isLoading, fetchMembers, addMember, updateMember, deleteMember } = useFamilyStore();
  const { activeMemberId, activeMemberName, setActiveMember } = useActiveMemberStore();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const activeLabel = useMemo(() => (activeMemberId ? activeMemberName : 'Ben'), [activeMemberId, activeMemberName]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditingMember(null);
    setForm(emptyForm);
    setSheetVisible(true);
  };

  const openEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setForm({
      name: member.name,
      relation: member.relation,
      birth_date: member.birth_date || '',
      note: member.note || '',
    });
    setSheetVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        relation: form.relation,
        birth_date: form.birth_date.trim() || undefined,
        note: form.note.trim() || undefined,
      };
      if (editingMember) {
        await updateMember(editingMember.id, payload);
      } else {
        await addMember(payload);
      }
      setSheetVisible(false);
      setEditingMember(null);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (member: FamilyMember) => {
    Alert.alert(
      'Aile bireyi silinsin mi?',
      `${member.name} profiline ait ilac, hatirlatici, olcum ve kayitlar da temizlenecek.`,
      [
        { text: 'Vazgec', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteMember(member.id);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <SectionHeader
          title="Aile profilleri"
          subtitle={`Aktif profil: ${activeLabel}`}
          right={<Button title="Yeni" size="sm" onPress={openCreate} icon="add" />}
        />

        <AppCard style={[styles.profileCard, activeMemberId === null && { borderColor: colors.primary, borderWidth: 1 }]} onPress={() => setActiveMember(null, 'Ben')}>
          <View style={styles.profileRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.textPrimary }]}>Ben</Text>
              <Text style={[styles.profileMeta, { color: colors.textSecondary }]}>Birincil hesap</Text>
            </View>
            <Chip label={activeMemberId === null ? 'Aktif' : 'Sec'} color={activeMemberId === null ? colors.success : colors.primary} />
          </View>
        </AppCard>

        {members.length === 0 ? (
          <EmptyState
            icon="people"
            title="Aile profili eklenmedi"
            description="Her aile bireyi icin ayri ilac, hatirlatici ve olcum takibi yapabilirsiniz."
            actionLabel="Ilk profili ekle"
            onAction={openCreate}
          />
        ) : (
          members.map((member) => (
            <AppCard key={member.id} style={[styles.profileCard, activeMemberId === member.id && { borderColor: colors.primary, borderWidth: 1 }]}>
              <View style={styles.profileRow}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setActiveMember(member.id, member.name)} activeOpacity={0.85}>
                  <View style={styles.profileRow}>
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.secondary}18` }]}>
                      <Ionicons name="people" size={24} color={colors.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.profileName, { color: colors.textPrimary }]}>{member.name}</Text>
                      <Text style={[styles.profileMeta, { color: colors.textSecondary }]}>{relationLabels[member.relation] || member.relation}</Text>
                      {member.birth_date ? <Text style={[styles.profileMeta, { color: colors.textSecondary }]}>{member.birth_date}</Text> : null}
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.actionColumn}>
                  <Chip label={activeMemberId === member.id ? 'Aktif' : 'Sec'} color={activeMemberId === member.id ? colors.success : colors.primary} onPress={() => setActiveMember(member.id, member.name)} />
                  <View style={styles.inlineActions}>
                    <IconButton icon="create-outline" onPress={() => openEdit(member)} size="sm" />
                    <IconButton icon="trash-outline" onPress={() => askDelete(member)} size="sm" color={colors.error} />
                  </View>
                </View>
              </View>
              {member.note ? <Text style={[styles.note, { color: colors.textSecondary }]}>{member.note}</Text> : null}
            </AppCard>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={editingMember ? 'Aile bireyini duzenle' : 'Yeni aile bireyi'}>
        <InputField label="Ad" placeholder="Orn. Ayse" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} />
        <SelectField label="Yakinlik" value={form.relation} options={relationOptions} onChange={(value) => setForm((prev) => ({ ...prev, relation: value as Relation }))} />
        <DatePickerField label="Dogum tarihi" value={form.birth_date} placeholder="Opsiyonel" onChange={(value) => setForm((prev) => ({ ...prev, birth_date: value }))} onClear={() => setForm((prev) => ({ ...prev, birth_date: '' }))} helper="Takvimden secilir, elle tarih yazmaya gerek yoktur." />
        <InputField label="Not" placeholder="Ilac kullanimina dair not" value={form.note} onChangeText={(value) => setForm((prev) => ({ ...prev, note: value }))} multiline />
        <View style={styles.sheetActions}>
          <Button title="Iptal" variant="ghost" onPress={() => setSheetVisible(false)} />
          <Button title={editingMember ? 'Guncelle' : 'Kaydet'} onPress={handleSave} loading={saving} disabled={!form.name.trim() || saving} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  profileCard: { gap: spacing.sm },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileMeta: { fontSize: 13, marginTop: 2 },
  actionColumn: { alignItems: 'flex-end', gap: spacing.sm },
  inlineActions: { flexDirection: 'row', gap: spacing.xs },
  note: { fontSize: 13, lineHeight: 19 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
});
