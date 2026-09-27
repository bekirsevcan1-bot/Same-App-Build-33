import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/constants/categories';
import { ANTALYA_DISTRICTS } from '@/constants/antalya';

const TEAL = '#00C8B3';
const ORANGE = '#FF9500';

const PRIORITIES = [
  { key: 'Acil', icon: 'alert-triangle', color: '#FF453A' },
  { key: 'Bugün', icon: 'sun', color: ORANGE },
  { key: 'Planlı', icon: 'calendar', color: TEAL },
] as const;

const TIME_OPTIONS = [
  'Bugün 09:00 - 12:00',
  'Bugün 12:00 - 15:00',
  'Bugün 15:00 - 18:00',
  'Bugün 16:00 - 19:00',
  'Yarın 09:00 - 12:00',
  'Esnek',
];

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Usta = {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  priceMin: number;
  priceMax: number;
  reviewCount: number;
  isOnline: boolean;
};

export default function TalepScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { form, setForm, resetForm, submitRequest, isSubmitting, deviceId } = useApp();

  const [step, setStep] = useState(1);
  const [locationLoading, setLocationLoading] = useState(false);
  const [matchedUstas, setMatchedUstas] = useState<Usta[]>([]);
  const [selectedUstaId, setSelectedUstaId] = useState<number | null>(null);
  const [loadingUstas, setLoadingUstas] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [mediaKindMap, setMediaKindMap] = useState<Record<string, 'image' | 'video'>>({});
  // Local URI map: objectPath → device-local URI for in-wizard preview
  // (avoids server requests that require auth headers from <Image>)
  const [localUriMap, setLocalUriMap] = useState<Record<string, string>>({});

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const selectedDistrict = ANTALYA_DISTRICTS.find((d) => d.name === form.semt);
  const serviceOptions: Record<string, string[]> = {
    'hali-yikama': ['Küçük halı', 'Yolluk', 'Büyük halı', 'Halı takımı'],
    'koltuk-yikama': ['Tekli koltuk', 'Çiftli koltuk', '3 kişilik koltuk', 'Köşe koltuk'],
    kaynak: Array.from({ length: 10 }, (_, index) => `${(index + 1) * 10} metre`),
    tadilat: Array.from({ length: 10 }, (_, index) => `${(index + 1) * 10} metre`),
    'su-tesisati': ['Musluk bozuldu', 'Boru patladı', 'Lavabo tıkanıklığı', 'Su kaçağı tespiti', 'Klozet arızası'],
    elektrik: ['Anahtar değişimi', 'Priz tamiri', 'Yeni kablo çekilecek', 'Daire altyapısı değişecek', 'Sigorta arızası', 'Aydınlatma kurulumu'],
    'sap-beton': ['Daire içi şap dökümü', 'Bina giriş beton dökümü', 'Çatı kat beton dökümü', 'Yürüyüş yolları beton dökümü'],
    nakliye: ['Asansörlü taşıma', 'Kamyonet', 'Kamyon', 'Panelvan', 'Pikap', 'TIR'],
  };
  const customOptions = serviceOptions[form.categoryId];
  const requiresCustomDetail = !!customOptions;

  const autoDetectLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum İzni', 'Konum otomatik algılanamadı.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
       if (addr) {
         const districtCandidate = addr.district ?? addr.subregion ?? '';
         const knownDistrict = ANTALYA_DISTRICTS.find((district) =>
           district.name.toLocaleLowerCase('tr-TR') === districtCandidate.trim().toLocaleLowerCase('tr-TR'),
         )?.name;
         const semt = knownDistrict ?? 'Muratpaşa';
         const mahalle = addr.name ?? addr.street ?? 'Merkez';
        setForm({
          semt,
          mahalle,
          sokak: addr.street ?? '',
          customerLatitude: loc.coords.latitude,
          customerLongitude: loc.coords.longitude,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Hata', 'Konum alınamadı.');
    } finally {
      setLocationLoading(false);
    }
  }, [setForm]);

  const loadUstas = useCallback(async () => {
    setLoadingUstas(true);
    try {
      const res = await fetch(`${API_BASE}/api/ustas`);
      if (!res.ok) return;
       const all: Usta[] = await res.json();
       setMatchedUstas(all.slice(0, 5));
    } catch {
      setMatchedUstas([]);
    } finally {
      setLoadingUstas(false);
    }
  }, []);

  useEffect(() => {
    if (step === 3) loadUstas();
  }, [step, loadUstas]);

  const MAX_PHOTOS = 10;

  const pickAndUploadPhoto = useCallback(async (source: 'camera' | 'gallery') => {
    if (form.photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit', `En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
      return;
    }
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Kamera erişimi verilmedi.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Galeri erişimi verilmedi.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploadingPhoto(true);

      try {
        // Upload image as multipart to the server; the server validates and stores in GCS
        const formData = new FormData();
        formData.append('photo', {
          uri: asset.uri,
          name: asset.fileName ?? 'photo.jpg',
          type: asset.mimeType ?? 'image/jpeg',
        } as unknown as Blob);

        const uploadRes = await fetch(`${API_BASE}/api/storage/upload`, {
          method: 'POST',
          headers: { 'x-device-id': deviceId },
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error ?? 'Yükleme başarısız');
        }
        const { objectPath } = await uploadRes.json() as { objectPath: string };

        // Store objectPath for submission; keep local URI for in-wizard preview
        // so the <Image> component doesn't need to fetch from the auth-protected server
        const kind = asset.type === 'video' ? 'video' : 'image';
        setLocalUriMap((prev) => ({ ...prev, [objectPath]: asset.uri }));
        setMediaKindMap((prev) => ({ ...prev, [objectPath]: kind }));
        setForm({ photos: [...form.photos, objectPath] });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert('Hata', 'Fotoğraf yüklenemedi. Lütfen tekrar deneyin.');
      } finally {
        setUploadingPhoto(false);
      }
    } catch {
      Alert.alert('Hata', 'Fotoğraf seçilemedi.');
    }
  }, [form.photos, deviceId, setForm]);

  const removePhoto = useCallback((objectPath: string) => {
    setForm({ photos: form.photos.filter((p) => p !== objectPath) });
    setLocalUriMap((prev) => {
      const next = { ...prev };
      delete next[objectPath];
      return next;
    });
    setMediaKindMap((prev) => {
      const next = { ...prev };
      delete next[objectPath];
      return next;
    });
  }, [form.photos, setForm]);

  const showPhotoOptions = useCallback(() => {
    if (Platform.OS === 'web') {
      pickAndUploadPhoto('gallery');
      return;
    }
    Alert.alert('Fotoğraf Ekle', 'Kaynak seçin', [
      { text: 'Kamera', onPress: () => pickAndUploadPhoto('camera') },
      { text: 'Galeri', onPress: () => pickAndUploadPhoto('gallery') },
      { text: 'İptal', style: 'cancel' },
    ]);
  }, [pickAndUploadPhoto]);

  const canNext = step === 1 ? !!(form.categoryId && (requiresCustomDetail ? form.serviceDetail : form.houseType) && form.semt) : true;

  const handleNext = useCallback(async () => {
    if (step < 3) {
      setStep((s) => s + 1);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      const selectedIds = form.selectedCategoryIds.length ? form.selectedCategoryIds : [form.categoryId];
      const selectedNames = form.selectedCategoryNames.length ? form.selectedCategoryNames : [form.categoryName];
      const results = [];
      for (let index = 0; index < selectedIds.length; index += 1) {
        const created = await submitRequest(selectedUstaId, { id: selectedIds[index], name: selectedNames[index] ?? form.categoryName });
        if (created) results.push(created);
      }
      const result = results[0];
      if (result && results.length === selectedIds.length) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetForm();
        router.replace(`/talep/${result.id}`);
      } else {
        Alert.alert('Hata', 'Talep gönderilemedi.');
      }
    }
  }, [step, submitRequest, selectedUstaId, resetForm, router, form.selectedCategoryIds, form.selectedCategoryNames, form.categoryId, form.categoryName]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  }, [step, router]);

  // ── HEADER ──────────────────────────────────────────────────────
  const stepLabel = step === 1 ? 'Hizmet ve Konum' : step === 2 ? 'Sorun Detayları' : 'Usta Seçimi';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name={step === 1 ? 'x' : 'arrow-left'} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Yeni bakım kaydı</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {step === 1 ? 'Neye ihtiyacınız var?' : step === 2 ? 'Ustanın hazırlıklı gelmesini sağlayın' : 'Uygun Ustalar'}
          </Text>
        </View>
        <View style={[styles.stepBadge, { backgroundColor: TEAL + '20' }]}>
          <Text style={[styles.stepBadgeText, { color: TEAL }]}>{step}/3</Text>
        </View>
      </View>

      {/* Step tabs */}
      <View style={[styles.stepTabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {['İhtiyaç', 'Detaylar', 'Onay'].map((lbl, i) => {
          const active = step === i + 1;
          const done = step > i + 1;
          return (
            <View key={lbl} style={styles.stepTab}>
              <Text style={[styles.stepTabText, { color: active ? TEAL : done ? TEAL + '88' : colors.mutedForeground }]}>
                {lbl}
              </Text>
              {(active || done) && (
                <View style={[styles.stepTabLine, { backgroundColor: active ? TEAL : TEAL + '50' }]} />
              )}
            </View>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1 ── */}
        {step === 1 && (
          <View style={{ gap: 20 }}>
            {/* Hizmet Türü */}
            <View>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  HİZMET TÜRÜ · Hangi konuda destek lazım?
                </Text>
                <Text style={[styles.sectionHint, { color: TEAL }]}>
                  {form.selectedCategoryIds.length ? `${form.selectedCategoryIds.length} hizmet seçildi` : 'Bir veya daha fazla seçin'}
                </Text>
              </View>
              <Text style={[styles.multiSelectHint, { color: colors.mutedForeground }]}>
                Aynı talepte birden fazla iş seçebilirsiniz. Örn: alçı + yalıtım + elektrik.
              </Text>
              <View style={styles.grid}>
                {CATEGORIES.map((cat) => {
                    const active = (form.selectedCategoryIds.length ? form.selectedCategoryIds : [form.categoryId]).includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => {
                        const current = form.selectedCategoryIds.length ? form.selectedCategoryIds : (form.categoryId ? [form.categoryId] : []);
                        const next = current.includes(cat.id) ? current.filter((id) => id !== cat.id) : [...current, cat.id];
                        const names = next.map((id) => CATEGORIES.find((item) => item.id === id)?.name ?? '');
                        setForm({
                          categoryId: next[0] ?? '',
                          categoryName: names[0] ?? '',
                          selectedCategoryIds: next,
                          selectedCategoryNames: names,
                          houseType: next.length === 1 ? form.houseType : '',
                          cleaningTeamSize: next.length === 1 ? form.cleaningTeamSize : '',
                          serviceDetail: next.length === 1 ? form.serviceDetail : '',
                        });
                      }}
                      activeOpacity={0.75}
                      style={[
                        styles.catCard,
                        {
                          backgroundColor: active ? TEAL + '18' : colors.card,
                          borderColor: active ? TEAL : colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.catIcon, { backgroundColor: active ? TEAL + '25' : cat.bgColor }]}>
                        <Feather name={cat.icon as any} size={18} color={active ? TEAL : cat.color} />
                      </View>
                      <Text style={[styles.catName, { color: active ? TEAL : colors.foreground }]}>
                        {cat.name}
                      </Text>
                      {active && <Feather name="check-circle" size={14} color={TEAL} style={{ position: 'absolute', top: 7, right: 7 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {form.categoryId && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{requiresCustomDetail ? 'HİZMET DETAYI' : 'İŞİN YAPILACAĞI EV TİPİ'}</Text>
                  <View style={styles.grid}>
                    {(customOptions ?? ['1+1', '2+1', '3+1', '4+1', 'Villa / Müstakil']).map((option) => (
                      <TouchableOpacity key={option} onPress={() => requiresCustomDetail ? setForm({ serviceDetail: option }) : setForm({ houseType: option })} style={[styles.catCard, { backgroundColor: (requiresCustomDetail ? form.serviceDetail : form.houseType) === option ? TEAL + '18' : colors.card, borderColor: (requiresCustomDetail ? form.serviceDetail : form.houseType) === option ? TEAL : colors.border }]}>
                        <Text style={[styles.catName, { color: (requiresCustomDetail ? form.serviceDetail : form.houseType) === option ? TEAL : colors.foreground }]}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {form.categoryId === 'ev-temizligi' && (
                    <>
                      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 14 }]}>TEMİZLİK EKİBİ</Text>
                      <View style={styles.grid}>
                        {['1 kişilik ekip', '2 kişilik ekip', '3 kişilik ekip'].map((size) => (
                          <TouchableOpacity key={size} onPress={() => setForm({ cleaningTeamSize: size })} style={[styles.catCard, { backgroundColor: form.cleaningTeamSize === size ? TEAL + '18' : colors.card, borderColor: form.cleaningTeamSize === size ? TEAL : colors.border }]}>
                            <Text style={[styles.catName, { color: form.cleaningTeamSize === size ? TEAL : colors.foreground }]}>{size}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Konum */}
            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>KONUM</Text>
              <Text style={[styles.locationTitle, { color: colors.foreground }]}>Bu talep nerede?</Text>

              <TouchableOpacity
                onPress={autoDetectLocation}
                disabled={locationLoading}
                style={[styles.autoBtn, { backgroundColor: TEAL + '15', borderColor: TEAL + '30' }]}
              >
                {locationLoading
                  ? <ActivityIndicator size="small" color={TEAL} />
                  : <Feather name="navigation" size={15} color={TEAL} />}
                <Text style={[styles.autoBtnText, { color: TEAL }]}>
                  {locationLoading ? 'Konum alınıyor...' : 'Konumumu Otomatik Algıla'}
                </Text>
              </TouchableOpacity>
              {form.customerLatitude != null && form.customerLongitude != null && (
                <View style={[styles.liveLocationNotice, { backgroundColor: TEAL + '12', borderColor: TEAL + '35' }]}>
                  <View style={[styles.liveLocationDot, { backgroundColor: TEAL }]} />
                  <Text style={[styles.liveLocationText, { color: TEAL }]}>Canlı konum talebinizle paylaşılacak</Text>
                  <Feather name="check-circle" size={14} color={TEAL} />
                </View>
              )}

              {/* Semt + Mahalle yan yana */}
              <View style={styles.locationRow}>
                <View style={[styles.locationBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.locationBoxLabel, { color: colors.mutedForeground }]}>İlçe / Semt</Text>
                  <ScrollView style={{ maxHeight: 130 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {ANTALYA_DISTRICTS.map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => setForm({ semt: d.name, mahalle: '', sokak: '' })}
                        style={[
                          styles.dropItem,
                          { backgroundColor: form.semt === d.name ? TEAL + '20' : 'transparent' },
                        ]}
                      >
                        <Text style={[styles.dropText, { color: form.semt === d.name ? TEAL : colors.foreground }]}>
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={[styles.locationBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.locationBoxLabel, { color: colors.mutedForeground }]}>Mahalle</Text>
                  <ScrollView style={{ maxHeight: 130 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {(selectedDistrict?.neighborhoods ?? []).map((n) => (
                      <TouchableOpacity
                        key={n.id}
                        onPress={() => setForm({ mahalle: n.name })}
                        style={[
                          styles.dropItem,
                          { backgroundColor: form.mahalle === n.name ? TEAL + '20' : 'transparent' },
                        ]}
                      >
                        <Text style={[styles.dropText, { color: form.mahalle === n.name ? TEAL : colors.foreground }]}>
                          {n.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {!selectedDistrict && (
                      <Text style={[styles.dropText, { color: colors.mutedForeground, padding: 10 }]}>
                        Önce ilçe seçin
                      </Text>
                    )}
                  </ScrollView>
                </View>
              </View>

              {/* Sokak / Adres notu */}
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="map-pin" size={15} color={colors.mutedForeground} />
                <TextInput
                  placeholder="Sokak / Adres notu (isteğe bağlı)"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.sokak}
                  onChangeText={(t) => setForm({ sokak: t })}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>
            </View>
          </View>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <View style={{ gap: 18 }}>
            {/* Başlık */}
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="file-text" size={15} color={colors.mutedForeground} />
              <TextInput
                placeholder={`Talep başlığı (örn: ${form.categoryName ?? 'Elektrik'} sorunu)`}
                placeholderTextColor={colors.mutedForeground}
                value={form.title}
                onChangeText={(t) => setForm({ title: t })}
                style={[styles.input, { color: colors.foreground }]}
              />
            </View>

            {/* Açıklama */}
            <View style={[styles.textAreaWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                placeholder="Açıklama: Sorunu veya ihtiyacı detaylı anlatın...&#10;Örn: Salonun iki prizinde elektrik kesildi. Sigortalar açık gözüküyor..."
                placeholderTextColor={colors.mutedForeground}
                value={form.description}
                onChangeText={(t) => setForm({ description: t })}
                style={[styles.textArea, { color: colors.foreground }]}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Öncelik */}
            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ÖNCELİK DERECESİ</Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map((p) => {
                  const active = form.priority === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => setForm({ priority: p.key })}
                      activeOpacity={0.8}
                      style={[
                        styles.priorityBtn,
                        {
                          backgroundColor: active ? p.color + '20' : colors.card,
                          borderColor: active ? p.color : colors.border,
                        },
                      ]}
                    >
                      <Feather name={p.icon as any} size={15} color={active ? p.color : colors.mutedForeground} />
                      <Text style={[styles.priorityText, { color: active ? p.color : colors.foreground }]}>
                        {p.key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tercih edilen zaman */}
            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TERCİH EDİLEN ZİYARET ZAMANI</Text>
              <View style={{ gap: 8 }}>
                {TIME_OPTIONS.map((t) => {
                  const active = form.timeRange === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setForm({ timeRange: t })}
                      activeOpacity={0.8}
                      style={[
                        styles.timeItem,
                        {
                          backgroundColor: active ? TEAL + '15' : colors.card,
                          borderColor: active ? TEAL : colors.border,
                        },
                      ]}
                    >
                      <Feather name="clock" size={14} color={active ? TEAL : colors.mutedForeground} />
                      <Text style={[styles.timeText, { color: active ? TEAL : colors.foreground }]}>{t}</Text>
                      {active && <Feather name="check" size={14} color={TEAL} style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Fotoğraf */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>
                   SORUNU GÖSTERİN (RESİM / VİDEO)
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.mutedForeground }}>
                  {form.photos.length}/{MAX_PHOTOS}
                </Text>
              </View>
              <View style={styles.photoRow}>
                {/* Uploaded photo thumbnails — use device-local URI during wizard
                    so <Image> never needs auth headers to preview */}
                {form.photos.map((objectPath) => (
                  <View key={objectPath} style={[styles.photoBox, { backgroundColor: colors.card, borderColor: TEAL + '50', borderStyle: 'solid' }]}>
                    {mediaKindMap[objectPath] === 'video' ? (
                      <View style={{ width: '100%', height: '100%', borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15252A' }}>
                        <Feather name="video" size={22} color={TEAL} />
                        <Text style={{ color: TEAL, fontSize: 10, marginTop: 4 }}>Video</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: localUriMap[objectPath] ?? '' }} style={{ width: '100%', height: '100%', borderRadius: 11 }} resizeMode="cover" />
                    )}
                    <TouchableOpacity
                      onPress={() => removePhoto(objectPath)}
                      style={styles.photoRemoveBtn}
                    >
                      <Feather name="x" size={10} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Upload / loading button */}
                {form.photos.length < MAX_PHOTOS && (
                  <TouchableOpacity
                    onPress={showPhotoOptions}
                    disabled={uploadingPhoto}
                    style={[styles.photoBox, styles.photoAdd, { backgroundColor: TEAL + '15', borderColor: TEAL + '40' }]}
                  >
                    {uploadingPhoto
                      ? <ActivityIndicator size="small" color={TEAL} />
                      : <Feather name="plus" size={22} color={TEAL} />}
                  </TouchableOpacity>
                )}
              </View>
              {form.photos.length === 0 && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.mutedForeground, marginTop: 6 }}>
                   Resim veya video eklemek isteğe bağlıdır; usta işi önceden görüp hazırlıklı gelir.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <View style={{ gap: 18 }}>
            {/* Özet Kart */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: TEAL + '30' }]}>
              <View style={styles.summaryRow}>
                <Feather name="tag" size={14} color={colors.mutedForeground} />
                <Text style={[styles.summaryLbl, { color: colors.mutedForeground }]}>Hizmet</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]}>{form.categoryName}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.summaryLbl, { color: colors.mutedForeground }]}>Konum</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]} numberOfLines={1}>
                  {form.mahalle ? `${form.mahalle}, ` : ''}{form.semt}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Feather name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.summaryLbl, { color: colors.mutedForeground }]}>Zaman</Text>
                <Text style={[styles.summaryVal, { color: colors.foreground }]}>{form.timeRange || 'Esnek'}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Feather name="dollar-sign" size={14} color={colors.mutedForeground} />
                <Text style={[styles.summaryLbl, { color: colors.mutedForeground }]}>Tahmini</Text>
                <Text style={[styles.summaryVal, { color: ORANGE }]}>₺350 – ₺900</Text>
              </View>
            </View>

            {/* Usta listesi */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>UYGUN USTALAR</Text>

            {loadingUstas ? (
              <View style={styles.centerLoad}>
                <ActivityIndicator color={TEAL} />
                <Text style={[{ color: colors.mutedForeground, marginTop: 8, fontFamily: 'Inter_400Regular', fontSize: 13 }]}>
                  Ustalar aranıyor...
                </Text>
              </View>
            ) : matchedUstas.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={28} color={colors.mutedForeground} />
                <Text style={[{ color: colors.mutedForeground, marginTop: 10, fontFamily: 'Inter_400Regular' }]}>
                  Şu an uygun usta bulunamadı
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {matchedUstas.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    onPress={() => setSelectedUstaId(selectedUstaId === u.id ? null : u.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.ustaCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: selectedUstaId === u.id ? TEAL : colors.border,
                      },
                    ]}
                  >
                    {/* Avatar */}
                    <View style={[styles.ustaAvatar, { backgroundColor: TEAL + '20' }]}>
                      <Text style={[styles.ustaAvatarText, { color: TEAL }]}>
                        {u.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.ustaName, { color: colors.foreground }]}>{u.name}</Text>
                      <Text style={[styles.ustaSpec, { color: colors.mutedForeground }]}>{u.specialty}</Text>
                      <View style={styles.starRow}>
                        <Feather name="star" size={12} color={ORANGE} />
                        <Text style={[styles.starText, { color: colors.mutedForeground }]}>
                          {u.rating.toFixed(1)} ({u.reviewCount})
                        </Text>
                        {u.isOnline && <Text style={[styles.onlineHint, { color: TEAL }]}> • Müsait</Text>}
                      </View>
                    </View>

                    {/* Price + Seç */}
                    <View style={styles.ustaRight}>
                      <Text style={[styles.ustaPrice, { color: ORANGE }]}>₺{u.priceMin}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedUstaId(u.id)}
                        style={[
                          styles.secBtn,
                          {
                            backgroundColor: selectedUstaId === u.id ? TEAL : colors.card,
                            borderColor: TEAL,
                          },
                        ]}
                      >
                        <Text style={[styles.secBtnText, { color: selectedUstaId === u.id ? '#121212' : TEAL }]}>
                          {selectedUstaId === u.id ? 'Seçildi' : 'Seç'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Alt Buton */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 10 }]}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={isSubmitting || (step === 1 && !canNext)}
          activeOpacity={0.85}
          style={[
            styles.sendBtn,
            { backgroundColor: (step === 1 && !canNext) ? colors.muted : ORANGE, opacity: isSubmitting ? 0.7 : 1 },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.sendBtnText}>
                {step === 3 ? 'Talebi Gönder' : 'Devam et'}
              </Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 2 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  stepBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  stepTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  stepTab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
  stepTabText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  stepTabLine: { height: 2, width: '60%', borderRadius: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.5, marginBottom: 10 },
  sectionHint: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  multiSelectHint: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: -12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '23%',
    aspectRatio: 0.9,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
  },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName: { fontFamily: 'Inter_500Medium', fontSize: 10, textAlign: 'center' },
  locationTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 10 },
  autoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  autoBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  liveLocationNotice: { marginTop: -3, marginBottom: 10, borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveLocationDot: { width: 7, height: 7, borderRadius: 4 },
  liveLocationText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  locationRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  locationBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  locationBoxLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, marginBottom: 6 },
  dropItem: { paddingVertical: 7, paddingHorizontal: 6, borderRadius: 8 },
  dropText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },
  textAreaWrap: { padding: 14, borderRadius: 12, borderWidth: 1 },
  textArea: { fontFamily: 'Inter_400Regular', fontSize: 14, minHeight: 100 },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  priorityText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoAdd: {},
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  summaryLbl: { fontFamily: 'Inter_400Regular', fontSize: 13, width: 64 },
  summaryVal: { fontFamily: 'Inter_500Medium', fontSize: 13, flex: 1, textAlign: 'right' },
  divider: { height: 1 },
  centerLoad: { alignItems: 'center', paddingVertical: 40 },
  emptyBox: { alignItems: 'center', padding: 32, borderRadius: 14, borderWidth: 1 },
  ustaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  ustaAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ustaAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  ustaName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  ustaSpec: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  starText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  onlineHint: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  ustaRight: { alignItems: 'flex-end', gap: 6 },
  ustaPrice: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  secBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  secBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
  },
  sendBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, textAlign: 'center' },
  successSub: { fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  doneBtn: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  doneBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
});
