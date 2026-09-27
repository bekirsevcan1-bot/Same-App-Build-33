import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as ExpoLinking from 'expo-linking';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useColors } from '@/hooks/useColors';
import { useApp, type ServiceRequest } from '@/context/AppContext';
import { UstaCard, type Usta } from '@/components/UstaCard';
import { CATEGORIES } from '@/constants/categories';
import { supabase } from '@/lib/supabase';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const STATUS_FLOW = ['Beklemede', 'Devam Ediyor', 'Tamamlandı'] as const;

const STATUS_META: Record<string, { icon: string; color: string; desc: string }> = {
  Beklemede: { icon: 'clock', color: '#FF9500', desc: 'Talebiniz alındı, usta onayı bekleniyor' },
  'Devam Ediyor': { icon: 'tool', color: '#0A84FF', desc: 'Usta iş üzerinde çalışıyor' },
  Tamamlandı: { icon: 'check-circle', color: '#34C759', desc: 'İş tamamlandı' },
  İptal: { icon: 'x-circle', color: '#FF453A', desc: 'Talep iptal edildi' },
};

interface ReviewState {
  rating: number;
  comment: string;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
}

function StarRating({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} activeOpacity={0.7}>
          <Feather
            name="star"
            size={size}
            color={s <= value ? '#F5A623' : colors.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function TalepDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loadRequests, deviceId } = useApp();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [usta, setUsta] = useState<Usta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [lastLocationAt, setLastLocationAt] = useState<number | null>(null);
  const ustaFetchedFor = useRef<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const artisanMarker = useRef<any>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const [review, setReview] = useState<ReviewState>({
    rating: 0,
    comment: '',
    submitting: false,
    submitted: false,
    error: null,
  });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const loadRequest = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}`, {
        headers: deviceId ? { 'x-device-id': deviceId } : undefined,
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data: ServiceRequest = await res.json();
      setRequest(data);
      setError(false);

      // Load assigned usta once (or when assignment changes)
      if (data.assignedUstaId && ustaFetchedFor.current !== data.assignedUstaId) {
        ustaFetchedFor.current = data.assignedUstaId;
        try {
          const uRes = await fetch(`${API_BASE}/api/ustas/${data.assignedUstaId}`);
          if (uRes.ok) setUsta(await uRes.json());
        } catch {
          // ignore
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, deviceId]);

  const refreshRequestFromRealtime = useCallback(() => {
    void loadRequest();
  }, [loadRequest]);

  // Supabase Realtime is the primary path; polling remains a safe fallback for
  // devices/environments where the requests table publication is unavailable.
  useEffect(() => {
    loadRequest();
    const interval = setInterval(loadRequest, 5000);
    const channel = supabase?.channel(`request-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests', filter: `id=eq.${id}` },
        refreshRequestFromRealtime,
      )
      .subscribe();
    return () => {
      clearInterval(interval);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [id, loadRequest, refreshRequestFromRealtime]);

  // Animate the professional marker between GPS updates instead of snapping.
  useEffect(() => {
    if (request?.artisanLatitude == null || request.artisanLongitude == null) return;
    const next = { latitude: request.artisanLatitude, longitude: request.artisanLongitude };
    artisanMarker.current?.animateMarkerToCoordinate(next, 1400);
  }, [request?.artisanLatitude, request?.artisanLongitude]);

  // The assigned professional shares foreground GPS every few seconds while
  // this screen is open. Server-side ownership checks still apply to every tick.
  useEffect(() => {
    if (!request?.isAssignedProfessional || request.status === 'Tamamlandı' || request.status === 'İptal') return;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      setSharingLocation(true);
      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3500, distanceInterval: 8 },
        async ({ coords }) => {
          try {
            const response = await fetch(`${API_BASE}/api/requests/${request.id}/tracking`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
              body: JSON.stringify({
                latitude: coords.latitude,
                longitude: coords.longitude,
                heading: coords.heading,
                trackingStatus: 'Yolda',
              }),
            });
            if (response.ok) setLastLocationAt(Date.now());
          } catch {
            // The next GPS tick retries; the customer keeps the last known point.
          }
        },
      );
    })();
    return () => {
      cancelled = true;
      locationSubscription.current?.remove();
      locationSubscription.current = null;
      setSharingLocation(false);
    };
  }, [request?.id, request?.isAssignedProfessional, request?.status, deviceId]);

  const openNavigation = useCallback(async () => {
    if (request?.customerLatitude == null || request.customerLongitude == null) return;
    const destination = `${request.customerLatitude},${request.customerLongitude}`;
    const nativeUrl = Platform.OS === 'ios'
      ? `maps://?daddr=${destination}&dirflg=d`
      : `google.navigation:q=${destination}`;
    try {
      if (await ExpoLinking.canOpenURL(nativeUrl)) {
        await ExpoLinking.openURL(nativeUrl);
      } else {
        await ExpoLinking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
      }
    } catch {
      await ExpoLinking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    }
  }, [request?.customerLatitude, request?.customerLongitude]);

  const fitTrackingMap = useCallback(() => {
    if (!request?.customerLatitude || request.customerLongitude == null || !mapRef.current) return;
    const points = [{ latitude: request.customerLatitude, longitude: request.customerLongitude }];
    if (request.artisanLatitude != null && request.artisanLongitude != null) {
      points.push({ latitude: request.artisanLatitude, longitude: request.artisanLongitude });
    }
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 52, right: 42, bottom: 52, left: 42 },
      animated: true,
    });
  }, [request?.customerLatitude, request?.customerLongitude, request?.artisanLatitude, request?.artisanLongitude]);

  // Check if review already submitted for this request
  useEffect(() => {
    if (!request?.assignedUstaId || request.status !== 'Tamamlandı' || !request.canReview) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ustas/${request.assignedUstaId}/reviews`);
        if (!res.ok) return;
        const reviews: { requestId: number }[] = await res.json();
        if (reviews.some((r) => r.requestId === request.id)) {
          setReview((prev) => ({ ...prev, submitted: true }));
        }
      } catch {
        // ignore
      }
    })();
  }, [request?.assignedUstaId, request?.status, request?.canReview, request?.id]);

  const submitReview = useCallback(async () => {
    if (!request?.assignedUstaId || review.rating === 0 || review.submitting) return;
    setReview((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const res = await fetch(`${API_BASE}/api/ustas/${request.assignedUstaId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          rating: review.rating,
          comment: review.comment.trim() || null,
          requestId: request.id,
        }),
      });
      if (res.ok) {
        setReview((prev) => ({ ...prev, submitted: true, submitting: false }));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const body = await res.json().catch(() => null);
        setReview((prev) => ({
          ...prev,
          submitting: false,
          error: body?.error ?? 'Yorum gönderilemedi',
        }));
      }
    } catch {
      setReview((prev) => ({ ...prev, submitting: false, error: 'Bağlantı hatası' }));
    }
  }, [request, review.rating, review.comment, review.submitting, deviceId]);

  const changeStatus = useCallback(
    async (status: string) => {
      if (!request || updating) return;
      setUpdating(true);
      try {
        const res = await fetch(`${API_BASE}/api/requests/${request.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          const updated: ServiceRequest = await res.json();
          setRequest(updated);
          loadRequests();
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        // network error – polling will resync
      } finally {
        setUpdating(false);
      }
    },
    [request, updating, loadRequests, deviceId],
  );

  // Server-computed capability: request owner or assigned usta's owning device
  const canManage = !!request?.canManage;

  const currentIdx = request ? STATUS_FLOW.indexOf(request.status as any) : -1;
  const isCancelled = request?.status === 'İptal';
  const isCompleted = request?.status === 'Tamamlandı';
  const category = request ? CATEGORIES.find((c) => c.id === request.categoryId) : undefined;
  const nextStatus =
    currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  // Show review form: request owner, completed, has an assigned usta
  const showReviewSection =
    !!request?.canReview && isCompleted && !!request?.assignedUstaId;
  const hasTrackingCoordinates =
    request?.customerLatitude != null &&
    request?.customerLongitude != null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Talep Detayı</Text>
        <View style={styles.liveTag}>
          <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
          <Text style={[styles.liveText, { color: colors.green }]}>Canlı</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error || !request ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Talep yüklenemedi
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Request summary */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.titleRow}>
              {category && (
                <View style={[styles.catIcon, { backgroundColor: category.bgColor }]}>
                  <Feather name={category.icon as any} size={16} color={category.color} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.foreground }]}>{request.title}</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {request.mahalle}, {request.semt}
                  {request.sokak ? ` · ${request.sokak}` : ''}
                </Text>
              </View>
            </View>
            {request.description ? (
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>
                {request.description}
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="flag" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {request.priority}
                </Text>
              </View>
              {request.timeRange ? (
                <View style={styles.metaItem}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                    {request.timeRange}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Status timeline */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Durum</Text>
            {isCancelled ? (
              <View style={styles.timelineRow}>
                <View style={[styles.timelineIcon, { backgroundColor: '#2A0A0A' }]}>
                  <Feather name="x-circle" size={16} color="#FF453A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timelineLabel, { color: '#FF453A' }]}>İptal</Text>
                  <Text style={[styles.timelineDesc, { color: colors.mutedForeground }]}>
                    {STATUS_META['İptal']!.desc}
                  </Text>
                </View>
              </View>
            ) : (
              STATUS_FLOW.map((s, idx) => {
                const meta = STATUS_META[s]!;
                const done = idx < currentIdx;
                const active = idx === currentIdx;
                const color = done || active ? meta.color : colors.mutedForeground;
                return (
                  <View key={s} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineIcon,
                          {
                            backgroundColor: done || active ? meta.color + '22' : colors.secondary,
                          },
                        ]}
                      >
                        <Feather
                          name={done ? 'check' : (meta.icon as any)}
                          size={16}
                          color={color}
                        />
                      </View>
                      {idx < STATUS_FLOW.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            { backgroundColor: done ? meta.color : colors.border },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.timelineBody}>
                      <Text style={[styles.timelineLabel, { color }]}>{s}</Text>
                      {active && (
                        <Text style={[styles.timelineDesc, { color: colors.mutedForeground }]}>
                          {meta.desc}
                        </Text>
                      )}
                    </View>
                    {active && (
                      <View style={[styles.nowBadge, { backgroundColor: meta.color + '22' }]}>
                        <Text style={[styles.nowText, { color: meta.color }]}>Şu an</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          {/* Assigned usta */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Atanan Usta</Text>
            {usta ? (
              <UstaCard usta={usta} onSelect={() => router.push(`/usta/${usta.id}`)} />
            ) : (
              <View style={styles.noUsta}>
                <Feather name="user-x" size={22} color={colors.mutedForeground} />
                <Text style={[styles.noUstaText, { color: colors.mutedForeground }]}>
                  Henüz usta atanmadı
                </Text>
              </View>
            )}
          </View>

          {/* Only the request participants receive these coordinates from the API. */}
          {hasTrackingCoordinates && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.trackingHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Canlı iş takibi</Text>
                  <Text style={[styles.trackingHint, { color: colors.mutedForeground }]}>
                    {request.trackingStatus === 'Yolda' ? 'Ustanız yolda' : 'Müşteri konumu paylaşılıyor'}
                  </Text>
                </View>
                <View style={[styles.trackingLive, { backgroundColor: colors.primary + '18' }]}>
                  <View style={[styles.trackingDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.trackingLiveText, { color: colors.primary }]}>CANLI</Text>
                </View>
              </View>
              <MapView
                ref={mapRef}
                style={styles.trackingMap}
                initialRegion={{
                  latitude: request.customerLatitude!,
                  longitude: request.customerLongitude!,
                  latitudeDelta: 0.018,
                  longitudeDelta: 0.018,
                }}
                showsCompass={false}
                scrollEnabled={false}
                zoomEnabled={false}
                onMapReady={fitTrackingMap}
              >
                <Marker
                  coordinate={{ latitude: request.customerLatitude!, longitude: request.customerLongitude! }}
                  title="Sizin konumunuz"
                  pinColor={colors.primary}
                />
                {request.artisanLatitude != null && request.artisanLongitude != null && (
                  <Marker
                    ref={artisanMarker}
                    coordinate={{ latitude: request.artisanLatitude, longitude: request.artisanLongitude }}
                    title={usta?.name ?? 'Usta'}
                    description={request.trackingStatus === 'Yolda' ? 'Yolda' : 'Konum güncellendi'}
                    pinColor="#FF9500"
                  />
                )}
                {request.artisanLatitude != null && request.artisanLongitude != null && (
                  <Polyline
                    coordinates={[
                      { latitude: request.customerLatitude!, longitude: request.customerLongitude! },
                      { latitude: request.artisanLatitude, longitude: request.artisanLongitude },
                    ]}
                    strokeColor={colors.primary}
                    strokeWidth={4}
                    lineDashPattern={[1]}
                  />
                )}
              </MapView>
              <TouchableOpacity
                onPress={fitTrackingMap}
                activeOpacity={0.8}
                style={[styles.recenterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Feather name="maximize" size={14} color={colors.foreground} />
                <Text style={[styles.recenterText, { color: colors.foreground }]}>İkisini göster</Text>
              </TouchableOpacity>
              {usta && (
                <View style={[styles.ustaContact, { borderTopColor: colors.border }]}>
                  <View style={[styles.ustaContactAvatar, { backgroundColor: colors.primary + '18' }]}>
                    <Feather name="tool" size={15} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ustaContactName, { color: colors.foreground }]}>{usta.name}</Text>
                    <Text style={[styles.ustaContactMeta, { color: colors.mutedForeground }]}>
                      {request.trackingStatus === 'Yolda' ? 'Yolda · konumu güncelleniyor' : 'Atanan usta'}
                    </Text>
                  </View>
                  {usta.phone ? <Text style={[styles.ustaContactPhone, { color: colors.primary }]}>{usta.phone}</Text> : null}
                </View>
              )}
              {request.isAssignedProfessional && request.customerLatitude != null && (
                <View style={styles.navigationActions}>
                  <TouchableOpacity
                    onPress={openNavigation}
                    activeOpacity={0.8}
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  >
                    <Feather name="navigation" size={16} color={colors.primaryForeground} />
                    <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                      Müşteriye Git · Navigasyonu Başlat
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.sharingHint, { color: colors.mutedForeground }]}>
                    {sharingLocation
                      ? `Canlı konum paylaşılıyor${lastLocationAt ? ` · ${new Date(lastLocationAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}`
                      : 'Konum paylaşımı için cihaz izni bekleniyor'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Status actions */}
          {canManage && !isCancelled && !isCompleted && (
            <View style={styles.actions}>
              {nextStatus && (
                <TouchableOpacity
                  onPress={() => changeStatus(nextStatus)}
                  disabled={updating}
                  activeOpacity={0.8}
                  testID="advance-status-btn"
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: updating ? 0.6 : 1 }]}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Feather name="arrow-right-circle" size={16} color={colors.primaryForeground} />
                  )}
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                    {nextStatus === 'Devam Ediyor' ? 'İşi Başlat' : 'İşi Tamamla'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => changeStatus('İptal')}
                disabled={updating}
                activeOpacity={0.8}
                testID="cancel-request-btn"
                style={[styles.cancelBtn, { borderColor: colors.destructive + '55' }]}
              >
                <Feather name="x" size={14} color={colors.destructive} />
                <Text style={[styles.cancelBtnText, { color: colors.destructive }]}>
                  Talebi İptal Et
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Review section — visible to request owner after completion */}
          {showReviewSection && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Ustayı Değerlendir
              </Text>
              {review.submitted ? (
                <View style={styles.reviewSubmitted}>
                  <Feather name="check-circle" size={24} color="#34C759" />
                  <Text style={[styles.reviewSubmittedText, { color: colors.foreground }]}>
                    Değerlendirmeniz alındı, teşekkürler!
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.reviewHint, { color: colors.mutedForeground }]}>
                    Bu iş için ustayı puanlayın
                  </Text>
                  <View style={styles.starsRow}>
                    <StarRating
                      value={review.rating}
                      onChange={(r) => setReview((prev) => ({ ...prev, rating: r, error: null }))}
                    />
                    {review.rating > 0 && (
                      <Text style={[styles.ratingLabel, { color: colors.mutedForeground }]}>
                        {['', 'Kötü', 'Orta', 'İyi', 'Çok İyi', 'Mükemmel'][review.rating]}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.commentInput,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      placeholder="Yorum ekleyin (isteğe bağlı)"
                      placeholderTextColor={colors.mutedForeground}
                      value={review.comment}
                      onChangeText={(t) => setReview((prev) => ({ ...prev, comment: t }))}
                      multiline
                      numberOfLines={3}
                      style={[styles.commentText, { color: colors.foreground }]}
                    />
                  </View>
                  {review.error && (
                    <Text style={[styles.reviewError, { color: colors.destructive }]}>
                      {review.error}
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={submitReview}
                    disabled={review.rating === 0 || review.submitting}
                    activeOpacity={0.8}
                    style={[
                      styles.submitBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: review.rating === 0 || review.submitting ? 0.5 : 1,
                      },
                    ]}
                  >
                    {review.submitting ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Feather name="send" size={14} color={colors.primaryForeground} />
                    )}
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                      Değerlendirmeyi Gönder
                    </Text>
                  </TouchableOpacity>
                </>
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 5, width: 40 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  content: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  trackingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackingHint: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  trackingLive: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  trackingDot: { width: 6, height: 6, borderRadius: 3 },
  trackingLiveText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  trackingMap: { height: 180, borderRadius: 12 },
  recenterBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: -4,
  },
  recenterText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  ustaContact: { borderTopWidth: 1, paddingTop: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ustaContactAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  ustaContactName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  ustaContactMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  ustaContactPhone: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  navigationActions: { gap: 7, marginTop: 2 },
  sharingHint: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  desc: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center' },
  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: { width: 2, height: 24, marginVertical: 2 },
  timelineBody: { flex: 1, paddingTop: 6 },
  timelineLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  timelineDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  nowBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  nowText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  noUsta: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  noUstaText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  actions: { gap: 10 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  // Review section
  reviewHint: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingLabel: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  commentInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
  },
  commentText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlignVertical: 'top' },
  reviewError: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  reviewSubmitted: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  reviewSubmittedText: { fontFamily: 'Inter_500Medium', fontSize: 14, flex: 1 },
});
