# V6 UX Scroll / Picker / Hatırlatıcı Durum Revizyonu

Bu revizyon ana mimariyi değiştirmeden yalnızca kullanıcı deneyimi ve hatırlatıcı durum gösterimi için yapılmıştır.

## Yapılanlar

- BottomSheet scroll davranışı iyileştirildi.
  - Klavye açıkken kaydet/iptal butonlarına erişim kolaylaştırıldı.
  - İçerik alt boşluğu artırıldı.
  - ScrollView `keyboardShouldPersistTaps`, `nestedScrollEnabled` ve keyboard inset ayarlarıyla güçlendirildi.

- Tarih ve saat seçiciler daha görünür hale getirildi.
  - iOS spinner görünümü için minimum yükseklik verildi.
  - Seçilen tarih/saat üstte okunabilir şekilde gösterildi.
  - `Tamam` butonu eklendi.
  - Tarihler kullanıcıya `GG.AA.YYYY` biçiminde gösterilmeye başladı; backend veri formatı korunmuştur.

- Kaydetme butonları optimize edildi.
  - Kayıt sırasında loading göstergesi eklendi.
  - Çift tıklama/tekrar kayıt riski azaltıldı.
  - İlaç, hatırlatıcı, aile profili ve ölçüm bottom sheet formlarında kaydetme davranışı güçlendirildi.

- Hatırlatıcı durum gösterimi düzeltildi.
  - Kullanıcı aynı gün içinde ilgili ilacı `Alındı` olarak işaretlediyse, saat geçmiş olsa bile ekranda `Gecikti` yerine `Alındı` gösterilir.

## Değiştirilen dosyalar

- frontend/src/components/UI.tsx
- frontend/src/components/DateTimeFields.tsx
- frontend/src/store/logStore.ts
- frontend/app/(tabs)/reminders.tsx
- frontend/app/(tabs)/medications.tsx
- frontend/app/(tabs)/family.tsx
- frontend/app/(tabs)/measurement-detail.tsx
- frontend/app/(tabs)/measurements.tsx

## Not

Push bildirim / EAS / projectId hattına dokunulmadı. Backend mimarisi ve API route yapısı değiştirilmedi.
