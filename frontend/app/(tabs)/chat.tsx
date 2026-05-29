import React, { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppCard, Button, Chip, IconButton } from '../../src/components/UI';
import { useActiveMemberStore } from '../../src/store/activeMemberStore';
import { useChatStore } from '../../src/store/chatStore';
import { spacing } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';

const promptSuggestions = [
  'Ilaclarim hakkinda genel bilgi ver',
  'Bu hafta hatirlaticilarimi nasil duzenlemeliyim?',
  'Alerjilerime gore nelere dikkat etmeliyim?',
  'Olcum ekraninda neleri takip etmeliyim?',
];

export default function ChatScreen() {
  const theme = useAppTheme();
  const colors = theme.colors;
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { activeMemberName, activeMemberId } = useActiveMemberStore();
  const { messages, isLoading, sendMessage, clearMessages } = useChatStore();
  const [input, setInput] = useState('');

  const hasMessages = messages.length > 0;
  const assistantInfo = useMemo(
    () => 'Bu alan ilaclar, hatirlaticilar ve uygulama ici yonlendirme konusunda yardim eder. Tibbi tani veya doz degisikligi vermez.',
    [],
  );

  const handleSend = async (text?: string) => {
    const payload = (text ?? input).trim();
    if (!payload) return;
    setInput('');
    await sendMessage(payload, activeMemberId || undefined);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
            <IconButton icon="arrow-back" onPress={() => router.back()} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Saglik asistani</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Aktif profil: {activeMemberName}</Text>
            </View>
          </View>
          {hasMessages ? <IconButton icon="trash-outline" onPress={clearMessages} /> : null}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {!hasMessages ? (
            <AppCard style={styles.introCard}>
              <View style={[styles.introIcon, { backgroundColor: `${colors.primary}16` }]}>
                <Ionicons name="chatbubbles" size={30} color={colors.primary} />
              </View>
              <Text style={[styles.introTitle, { color: colors.textPrimary }]}>Uygulama ici yonlendirmeli sohbet</Text>
              <Text style={[styles.introText, { color: colors.textSecondary }]}>{assistantInfo}</Text>
              <View style={styles.promptWrap}>
                {promptSuggestions.map((prompt) => (
                  <Chip key={prompt} label={prompt} onPress={() => handleSend(prompt)} />
                ))}
              </View>
            </AppCard>
          ) : null}

          {messages.map((message) => {
            const mine = message.role === 'user';
            return (
              <View key={message.id} style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowBot]}>
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: mine ? colors.primary : colors.backgroundElevated,
                      borderColor: mine ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.messageText, { color: mine ? colors.textOnPrimary : colors.textPrimary }]}>{message.text}</Text>
                  {!mine && message.safety_note ? <Text style={[styles.safetyText, { color: colors.textSecondary }]}>{message.safety_note}</Text> : null}
                  {!mine && message.suggested_actions?.length ? (
                    <View style={styles.actionWrap}>
                      {message.suggested_actions.map((action) => (
                        <Button key={`${message.id}-${action.route}`} title={action.label} size="sm" variant="outline" onPress={() => router.push(action.route as any)} />
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.composer, { backgroundColor: colors.backgroundElevated, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Ilac, hatirlatici veya olcum ile ilgili bir soru yazin"
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={() => handleSend()} disabled={isLoading || !input.trim()}>
            {isLoading ? <Ionicons name="hourglass" size={22} color={colors.white} /> : <Ionicons name="send" size={20} color={colors.white} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 3 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  introCard: { gap: spacing.md },
  introIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  introTitle: { fontSize: 18, fontWeight: '700' },
  introText: { fontSize: 14, lineHeight: 20 },
  promptWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  messageRow: { flexDirection: 'row' },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowBot: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '88%', borderWidth: 1, borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  messageText: { fontSize: 15, lineHeight: 22 },
  safetyText: { fontSize: 12, lineHeight: 17 },
  actionWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  composer: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 48, maxHeight: 110, borderWidth: 1, borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: 12, textAlignVertical: 'top', fontSize: 15 },
  sendButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
