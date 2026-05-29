import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { AppCard, Button, Chip, EmptyState, IconButton } from '../../src/components/UI';
import { InputField } from '../../src/components/Form';
import { OCRAnalysis } from '../../src/models';
import { ocrAPI } from '../../src/services/api';
import { useActiveMemberStore } from '../../src/store/activeMemberStore';
import { notifyError } from '../../src/store/uiStore';
import { spacing } from '../../src/theme';
import { useAppTheme } from '../../src/theme/useTheme';

export default function OCRScreen() {
  const theme = useAppTheme();
  const colors = theme.colors;
  const router = useRouter();
  const { activeMemberId, activeMemberName } = useActiveMemberStore();
  const [selectedImage, setSelectedImage] = useState<{ uri: string; type?: string; name?: string } | null>(null);
  const [manualText, setManualText] = useState('');
  const [analysis, setAnalysis] = useState<OCRAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notifyError('Izin gerekli', useCamera ? 'Kamera izni verilmedi.' : 'Galeri izni verilmedi.');
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setSelectedImage({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || 'medication.jpg' });
    setAnalysis(null);
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const response = selectedImage
        ? await ocrAPI.uploadImage(selectedImage, activeMemberId || undefined, manualText.trim() || undefined)
        : await ocrAPI.analyzeText(manualText.trim(), activeMemberId || undefined);
      setAnalysis(response);
    } catch (error: any) {
      notifyError('Ilac analizi basarisiz', error.message);
    } finally {
      setLoading(false);
    }
  };

  const suitabilityColor = (value?: string) => {
    if (value === 'appropriate') return colors.success;
    if (value === 'caution') return colors.warning;
    if (value === 'avoid') return colors.error;
    return colors.primary;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
              <IconButton icon="arrow-back" onPress={() => router.back()} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Ilac fotografi analizi</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Aktif profil: {activeMemberName}</Text>
              </View>
            </View>
          </View>

          <AppCard style={styles.actionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Gorsel veya metin ile analiz</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Bu alan ayri OpenAI anahtari ve ayri model ile calisir. Ilac adi tespiti yapar ve hasta baglamina gore yorum olusturur.</Text>
            <View style={styles.buttonRow}>
              <Button title="Kameradan cek" onPress={() => pickImage(true)} icon="camera" />
              <Button title="Galeriden sec" variant="outline" onPress={() => pickImage(false)} icon="images" />
            </View>
            {selectedImage ? (
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            ) : (
              <EmptyState icon="camera" title="Ilac gorseli secilmedi" description="Kamera veya galeriden ilac kutusu, blister veya prospektus secin." />
            )}
            <InputField label="Ek metin / prospektus notu" placeholder="Kutudaki metni veya ek notlari yazin" value={manualText} onChangeText={setManualText} multiline />
            <Button title={loading ? 'Analiz ediliyor...' : 'Analizi baslat'} onPress={runAnalysis} loading={loading} disabled={loading || (!selectedImage && !manualText.trim())} fullWidth />
          </AppCard>

          {analysis ? (
            <AppCard style={styles.resultCard}>
              <View style={styles.rowBetween}>
                <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{analysis.detected_medicine_name || 'Ilac tespit edilemedi'}</Text>
                <Chip label={analysis.confidence || 'low'} color={suitabilityColor(analysis.suitability)} />
              </View>
              <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{analysis.usage_area}</Text>

              <View style={styles.chipWrap}>
                <Chip label={`Uygunluk: ${analysis.suitability || 'unknown'}`} color={suitabilityColor(analysis.suitability)} icon="shield-checkmark" />
                <Chip label={activeMemberName} icon="person" />
              </View>

              <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>Hasta yorumu</Text>
              <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{analysis.patient_assessment}</Text>

              {analysis.reasons?.length ? (
                <>
                  <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>Gerekceler</Text>
                  {analysis.reasons.map((item, index) => (
                    <Text key={`${item}-${index}`} style={[styles.bulletText, { color: colors.textSecondary }]}>• {item}</Text>
                  ))}
                </>
              ) : null}

              {analysis.warnings?.length ? (
                <>
                  <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>Uyarilar</Text>
                  {analysis.warnings.map((item, index) => (
                    <Text key={`${item}-${index}`} style={[styles.bulletText, { color: colors.textSecondary }]}>• {item}</Text>
                  ))}
                </>
              ) : null}

              {analysis.matched_existing_medications?.length ? (
                <>
                  <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>Sistemdeki ilaclarla eslesme</Text>
                  <View style={styles.chipWrap}>
                    {analysis.matched_existing_medications.map((item) => (
                      <Chip key={item} label={item} color={colors.secondary} />
                    ))}
                  </View>
                </>
              ) : null}
            </AppCard>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 3 },
  actionCard: { gap: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionText: { fontSize: 14, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  previewImage: { width: '100%', height: 220, borderRadius: 18 },
  resultCard: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  resultTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  blockTitle: { fontSize: 14, fontWeight: '700', marginTop: spacing.sm },
  bulletText: { fontSize: 13, lineHeight: 19 },
});
