import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/constants/categories';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface UstaDetail {
  id: number;
  name: string;
  phone?: string | null;
  specialty: string;
  categoryId: string;
  rating: number;
  reviewCount: number;
  priceMin: number;
  priceMax: number;
  isOnline: boolean;
  verified: boolean;
  bio?: string | null;
  avatarUrl?: string | null;
  claimed?: boolean;
  canManage?: boolean;
  claimable?: boolean;
  portfolio?: PortfolioItem[];
}

interface PortfolioItem {
  id: number;
  title?: string | null;
  url: string;
  createdAt: string;
}

interface ReviewItem {
  id: number;
  ustaId: number;
  requestId: number;
  rating: number;
  comment: string | null;
  reviewerName: string;
  createdAt: string;
}

function ReviewCard({ review, colors }: { review: ReviewItem; colors: ReturnType<typeof useColors> }) {
  const date = new Date(review.createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <View style={[reviewStyles.card, { borderColor: colors.border }]}>
      <View style={reviewStyles.header}>
        <View style={reviewStyles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Feather
              key={s}
              name="star"
              size={13}
              color={s <= review.rating ? '#F5A623' : colors.border}
            />
          ))}
        </View>
        <Text style={[reviewStyles.date, { color: colors.mutedForeground }]}>{date}</Text>
      </View>
      <Text style={[reviewStyles.name, { color: colors.foreground }]}>{review.reviewerName}</Text>
      {review.comment ? (
        <Text style={[reviewStyles.comment, { color: colors.mutedForeground }]}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  card: { borderTopWidth: 1, paddingTop: 12, gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stars: { flexDirection: 'row', gap: 2 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  comment: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
});

export default function UstaDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deviceId } = useApp();

  const [usta, setUsta] = useState<UstaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const loadUsta = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ustas/${id}`, {
        headers: deviceId ? { 'x-device-id': deviceId } : undefined,
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setUsta(await res.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, deviceId]);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ustas/${id}/reviews`);
      if (res.ok) {
        setReviews(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUsta();
    loadReviews();
  }, [loadUsta, loadReviews]);

  const toggleOnline = useCallback(async () => {
    if (!usta || updatingStatus) return;
    setUpdatingStatus(true);
    setClaimError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-device-id': deviceId,
      };
      // Unclaimed profile: send the enrollment claim code to claim it
      if (!usta.claimed && claimCode.trim()) {
        headers['x-claim-code'] = claimCode.trim();
      }
      const res = await fetch(`${API_BASE}/api/ustas/${usta.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isOnline: !usta.isOnline }),
      });
      if (res.ok) {
        const updated: UstaDetail = await res.json();
        setUsta(updated);
        setClaimCode('');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const body = await res.json().catch(() => null);
        setClaimError(body?.error ?? 'İşlem başarısız');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setClaimError('Bağlantı hatası');
    } finally {
      setUpdatingStatus(false);
    }
  }, [usta, updatingStatus, deviceId, claimCode]);

  // Server-computed capabilities
  const canManage = !!usta?.canManage;
  const claimable = !!usta?.claimable;

  const addPortfolioImage = useCallback(async () => {
    if (!usta || portfolioUploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || !result.assets?.[0]) return;
    setPortfolioUploading(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('photo', {
        uri: asset.uri,
        name: asset.fileName ?? 'portfolio.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      const upload = await fetch(`${API_BASE}/api/storage/upload`, {
        method: 'POST',
        headers: { 'x-device-id': deviceId },
        body: formData,
      });
      if (!upload.ok) throw new Error('upload');
      const { objectPath } = await upload.json() as { objectPath: string };
      const link = await fetch(`${API_BASE}/api/ustas/${usta.id}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
        body: JSON.stringify({ objectPath }),
      });
      if (!link.ok) throw new Error('link');
      await loadUsta();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setClaimError('Galeri görseli eklenemedi');
    } finally {
      setPortfolioUploading(false);
    }
  }, [usta, portfolioUploading, deviceId, loadUsta]);

  const removePortfolioImage = useCallback(async (item: PortfolioItem) => {
    if (!usta) return;
    const response = await fetch(`${API_BASE}/api/ustas/${usta.id}/portfolio/${item.id}`, {
      method: 'DELETE',
      headers: { 'x-device-id': deviceId },
    });
    if (response.ok) await loadUsta();
  }, [usta, deviceId, loadUsta]);

  const category = usta ? CATEGORIES.find((c) => c.id === usta.categoryId) : undefined;
  const initials = usta
    ? usta.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Usta Profili</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error || !usta ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Usta bilgileri yüklenemedi
          </Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              loadUsta();
            }}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {usta.avatarUrl ? (
              <Image source={{ uri: usta.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
              </View>
            )}

            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground }]}>{usta.name}</Text>
              {usta.verified && (
                <View style={styles.verifiedBadge}>
                  <Feather name="check-circle" size={12} color="#34C759" />
                  <Text style={styles.verifiedText}>Onaylı</Text>
                </View>
              )}
            </View>

            <View style={styles.specialtyRow}>
              {category && (
                <View style={[styles.catIcon, { backgroundColor: category.bgColor }]}>
                  <Feather name={category.icon as any} size={12} color={category.color} />
                </View>
              )}
              <Text style={[styles.specialty, { color: colors.mutedForeground }]}>{usta.specialty}</Text>
            </View>

            {/* Online status */}
            <View
              style={[
                styles.onlineBadge,
                { backgroundColor: usta.isOnline ? '#0A2015' : colors.secondary },
              ]}
            >
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: usta.isOnline ? colors.green : colors.mutedForeground },
                ]}
              />
              <Text
                style={[
                  styles.onlineText,
                  { color: usta.isOnline ? colors.green : colors.mutedForeground },
                ]}
              >
                {usta.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.statTop}>
                <Feather name="star" size={14} color="#F5A623" />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {usta.rating.toFixed(1)}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Puan</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.statTop}>
                <Feather name="users" size={14} color={colors.blue} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{usta.reviewCount}</Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Referans</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.statTop}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  ₺{usta.priceMin}–{usta.priceMax}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Fiyat Aralığı</Text>
            </View>
          </View>

          {/* Bio */}
          {usta.bio ? (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Hakkında</Text>
              <Text style={[styles.bioText, { color: colors.mutedForeground }]}>{usta.bio}</Text>
            </View>
          ) : null}

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Yaptığı İşler</Text>
                <Text style={[styles.galleryHint, { color: colors.mutedForeground }]}>
                  Önceki inşaat, tesisat ve dekorasyon işleri
                </Text>
              </View>
              {canManage && (
                <TouchableOpacity onPress={addPortfolioImage} disabled={portfolioUploading} style={[styles.galleryAddBtn, { backgroundColor: colors.primary + '18' }]}>
                  {portfolioUploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="plus" size={16} color={colors.primary} />}
                  <Text style={[styles.galleryAddText, { color: colors.primary }]}>Ekle</Text>
                </TouchableOpacity>
              )}
            </View>
            {usta.portfolio?.length ? (
              <View style={styles.galleryGrid}>
                {usta.portfolio.map((item) => (
                  <View key={item.id} style={styles.galleryItem}>
                    <Image source={{ uri: `${API_BASE}${item.url}` }} style={styles.galleryImage} />
                    {canManage && (
                      <TouchableOpacity onPress={() => removePortfolioImage(item)} style={styles.galleryRemove}>
                        <Feather name="trash-2" size={13} color="#fff" />
                      </TouchableOpacity>
                    )}
                    {item.title ? <Text numberOfLines={1} style={[styles.galleryCaption, { color: colors.foreground }]}>{item.title}</Text> : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.noReviews, { color: colors.mutedForeground }]}>
                {canManage ? 'Yaptığınız işlerden fotoğraf ekleyin.' : 'Henüz iş galerisi eklenmemiş.'}
              </Text>
            )}
          </View>

          {/* Reviews / References */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Referanslar</Text>
              <View style={styles.refStars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Feather
                    key={s}
                    name="star"
                    size={13}
                    color={s <= Math.round(usta.rating) ? '#F5A623' : colors.border}
                  />
                ))}
                <Text style={[styles.refCount, { color: colors.mutedForeground }]}>
                  {usta.reviewCount > 0
                    ? `${usta.rating.toFixed(1)} · ${usta.reviewCount} değerlendirme`
                    : 'Henüz değerlendirme yok'}
                </Text>
              </View>
            </View>

            {reviewsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
            ) : reviews.length === 0 ? (
              <Text style={[styles.noReviews, { color: colors.mutedForeground }]}>
                Bu usta için henüz müşteri yorumu yok.
              </Text>
            ) : (
              reviews.map((r) => (
                <ReviewCard key={r.id} review={r} colors={colors} />
              ))
            )}
          </View>

          {/* Usta mode: owner manages status; unclaimed profiles require the enrollment claim code */}
          {(canManage || claimable) && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Usta Modu</Text>

              {claimable && (
                <View style={styles.claimBlock}>
                  <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
                    Bu profili yönetmek için ustaya verilen kayıt kodunu girin
                  </Text>
                  <View style={[styles.claimInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Feather name="key" size={14} color={colors.mutedForeground} />
                    <TextInput
                      placeholder="Kayıt kodu"
                      placeholderTextColor={colors.mutedForeground}
                      value={claimCode}
                      onChangeText={(t) => {
                        setClaimCode(t);
                        setClaimError(null);
                      }}
                      autoCapitalize="characters"
                      style={[styles.claimInput, { color: colors.foreground }]}
                      testID="claim-code-input"
                    />
                  </View>
                </View>
              )}

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                    Çevrimiçi Durumu
                  </Text>
                  <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
                    Çevrimiçiyken haritada görünür ve talep alırsınız
                  </Text>
                </View>
                {updatingStatus ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={usta.isOnline}
                    onValueChange={toggleOnline}
                    disabled={claimable && !claimCode.trim()}
                    trackColor={{ false: colors.secondary, true: colors.green }}
                    thumbColor="#fff"
                    testID="usta-online-toggle"
                  />
                )}
              </View>

              {claimError && (
                <Text style={[styles.claimErrorText, { color: colors.destructive }]}>
                  {claimError}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  content: { padding: 16, gap: 12 },
  profileCard: {
    alignItems: 'center',
    gap: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#0A2515',
  },
  verifiedText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#34C759' },
  specialtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialty: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  section: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  sectionHeader: { gap: 6 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  bioText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  galleryHint: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  galleryAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 },
  galleryAddText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galleryItem: { width: '31.8%', minWidth: 90, position: 'relative' },
  galleryImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#22303B' },
  galleryRemove: { position: 'absolute', top: 5, right: 5, width: 25, height: 25, borderRadius: 13, backgroundColor: '#B42318', alignItems: 'center', justifyContent: 'center' },
  galleryCaption: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  refStars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  refCount: { fontFamily: 'Inter_400Regular', fontSize: 12, marginLeft: 4 },
  noReviews: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  claimBlock: { gap: 8 },
  claimInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  claimInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, padding: 0 },
  claimErrorText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  toggleLabel: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  toggleHint: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
});
