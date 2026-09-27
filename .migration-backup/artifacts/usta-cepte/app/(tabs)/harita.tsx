import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/constants/categories';

const ANTALYA_CENTER = {
  latitude: 36.8969,
  longitude: 30.7133,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2c2c3e' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9eb0' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c2c2d0' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d2137' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0d2137' }] },
];

const TAB_BAR_HEIGHT = 80;

export default function HaritaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { ustaLocations, loadLocations } = useApp();

  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedUstaId, setSelectedUstaId] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // Initial location load — subsequent updates come via Supabase Realtime (see AppContext)
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    const coords = userLocation?.coords;
    if (!coords) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        const place = results[0];
        if (!cancelled && place) {
          const parts = [
            place.district ?? place.subregion,
            place.street ?? place.name,
            place.city ?? place.region,
          ].filter(Boolean);
          setUserAddress(parts.length ? `${parts.join(', ')}${place.country ? ` / ${place.country}` : ''}` : 'Konum adresi alınamadı');
        }
      } catch {
        if (!cancelled) setUserAddress('Adres bilgisi alınamadı');
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userLocation?.coords.latitude, userLocation?.coords.longitude]);

  const getCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Konum izni reddedildi. Lütfen ayarlardan izin verin.');
        return;
      }

      // Use highest accuracy
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      setUserLocation(loc);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        600,
      );
    } catch {
      setLocationError('GPS sinyali alınamadı. Açık alanda tekrar deneyin.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Start watching location on mount (background tracking)
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Konum izni verilmedi. Harita Antalya merkezinde gösteriliyor.');
          return;
        }

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => setUserLocation(loc),
        );
      } catch {
        setLocationError('GPS kullanılamıyor. Konum iznini ve cihaz GPS ayarlarını kontrol edin.');
      }
    })();

    return () => {
      sub?.remove();
    };
  }, []);

  const goToAntalya = useCallback(() => {
    mapRef.current?.animateToRegion(ANTALYA_CENTER, 600);
  }, []);

  const displayedLocations = filterCat
    ? ustaLocations.filter((l) => l.categoryId === filterCat)
    : ustaLocations;
  const displayedLocationMarkers = useMemo(
    () => displayedLocations.map((loc) => {
      const cat = CATEGORIES.find((c) => c.id === loc.categoryId);
      const isSelected = selectedUstaId === loc.ustaId;
      return (
        <Marker
          key={loc.ustaId}
          coordinate={{ latitude: loc.lat, longitude: loc.lng }}
          anchor={{ x: 0.5, y: 1 }}
          onPress={() => {
            setSelectedUstaId(loc.ustaId);
            Haptics.selectionAsync();
          }}
        >
          <View style={[styles.ustaMarker, { backgroundColor: isSelected ? (cat?.color ?? colors.primary) : colors.card, borderColor: cat?.color ?? colors.primary, transform: [{ scale: isSelected ? 1.15 : 1 }] }]}>
            <Feather name={(cat?.icon ?? 'tool') as any} size={14} color={isSelected ? '#fff' : (cat?.color ?? colors.primary)} />
          </View>
          <View style={[styles.markerTail, { borderTopColor: isSelected ? (cat?.color ?? colors.primary) : colors.card }]} />
        </Marker>
      );
    }),
    [displayedLocations, selectedUstaId, colors],
  );

  const selectedUsta = ustaLocations.find((l) => l.ustaId === selectedUstaId);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={ANTALYA_CENTER}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={false}
        onMapReady={() => setMapReady(true)}
        onPress={() => setSelectedUstaId(null)}
      >
        {/* User location */}
        {userLocation && (
          <>
            <Circle
              center={{
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
              }}
              radius={80}
              fillColor={colors.primary + '22'}
              strokeColor={colors.primary + '66'}
              strokeWidth={1}
            />
            <Marker
              coordinate={{
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.userDot, { borderColor: colors.primary }]}>
                <View style={[styles.userDotInner, { backgroundColor: colors.primary }]} />
              </View>
            </Marker>
          </>
        )}

        {/* Marker list is memoized so location updates do not recreate the map tree. */}
        {displayedLocationMarkers}
      </MapView>

      {/* Top overlay */}
      <View style={[styles.topOverlay, { top: topPad + 8 }]}>
        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          <TouchableOpacity
            onPress={() => setFilterCat(null)}
            style={[
              styles.chip,
              {
                backgroundColor: filterCat === null ? colors.primary : colors.card + 'EE',
              },
            ]}
          >
            <Text style={[styles.chipText, { color: filterCat === null ? colors.primaryForeground : colors.foreground }]}>
              Tümü ({ustaLocations.length})
            </Text>
          </TouchableOpacity>
          {CATEGORIES.filter((c) => c.id !== 'diger').map((cat) => {
            const count = ustaLocations.filter((l) => l.categoryId === cat.id).length;
            if (count === 0) return null;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: filterCat === cat.id ? cat.color : colors.card + 'EE',
                    borderColor: filterCat === cat.id ? cat.color : 'transparent',
                  },
                ]}
              >
                <Feather name={cat.icon as any} size={12} color={filterCat === cat.id ? '#fff' : cat.color} />
                <Text style={[styles.chipText, { color: filterCat === cat.id ? '#fff' : colors.foreground }]}>
                  {cat.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Right controls */}
      <View style={[styles.controls, { top: topPad + 60 }]}>
        <TouchableOpacity
          onPress={getCurrentLocation}
          disabled={locationLoading}
          activeOpacity={0.8}
          style={[styles.controlBtn, { backgroundColor: colors.card }]}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather
              name="navigation"
              size={20}
              color={userLocation ? colors.primary : colors.foreground}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToAntalya}
          activeOpacity={0.8}
          style={[styles.controlBtn, { backgroundColor: colors.card }]}
        >
          <Feather name="map" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Location error */}
      {locationError && (
        <View style={[styles.errorBanner, { backgroundColor: '#2A0A0A', borderColor: '#FF453A44' }]}>
          <Feather name="alert-circle" size={14} color="#FF453A" />
          <Text style={styles.errorText}>{locationError}</Text>
          <TouchableOpacity onPress={() => setLocationError(null)}>
            <Feather name="x" size={14} color="#FF453A" />
          </TouchableOpacity>
        </View>
      )}

      {/* Selected usta info card */}
      {selectedUsta && (
        <View
          style={[
            styles.ustaInfoCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              bottom: TAB_BAR_HEIGHT + (Platform.OS === 'web' ? 34 : insets.bottom) + 12,
            },
          ]}
        >
          <View style={styles.ustaInfoLeft}>
            {(() => {
              const cat = CATEGORIES.find((c) => c.id === selectedUsta.categoryId);
              return (
                <View style={[styles.ustaInfoIcon, { backgroundColor: cat?.bgColor ?? colors.secondary }]}>
                  <Feather name={(cat?.icon ?? 'tool') as any} size={18} color={cat?.color ?? colors.primary} />
                </View>
              );
            })()}
            <View>
              <Text style={[styles.ustaInfoName, { color: colors.foreground }]}>{selectedUsta.ustaName}</Text>
              <Text style={[styles.ustaInfoSpec, { color: colors.mutedForeground }]}>{selectedUsta.specialty}</Text>
              <View style={styles.ustaInfoOnline}>
                <View style={[styles.onlineDot, { backgroundColor: colors.green }]} />
                <Text style={[styles.ustaInfoOnlineText, { color: colors.green }]}>Aktif</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => router.push(`/usta/${selectedUsta.ustaId}`)}
            testID="usta-profile-btn"
          >
            <Feather name="user" size={16} color={colors.primaryForeground} />
            <Text style={[styles.contactBtnText, { color: colors.primaryForeground }]}>Profil</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom stats */}
      {!selectedUsta && (
        <View
          style={[
            styles.statsBar,
            {
              backgroundColor: colors.card + 'EE',
              borderColor: colors.border,
              bottom: TAB_BAR_HEIGHT + (Platform.OS === 'web' ? 34 : insets.bottom) + 12,
            },
          ]}
        >
          <View style={styles.statsItem}>
            <View style={[styles.onlineDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.statsText, { color: colors.foreground }]}>
              {ustaLocations.length} usta aktif
            </Text>
          </View>
          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
          <Text style={[styles.statsText, { color: colors.mutedForeground }]}>Antalya bölgesi</Text>
          {userLocation && (
            <>
              <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statsItem}>
                <Feather name="navigation" size={12} color={colors.primary} />
                <Text style={[styles.statsText, { color: colors.primary }]}>Konum alındı</Text>
              </View>
            </>
          )}
          {userAddress && (
            <Text style={[styles.addressText, { color: colors.foreground }]} numberOfLines={1}>
              {userAddress}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  filterChips: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  controls: {
    position: 'absolute',
    right: 12,
    zIndex: 10,
    gap: 8,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ustaMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -1,
  },
  errorBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 20,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#FF453A',
    flex: 1,
  },
  ustaInfoCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  ustaInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ustaInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ustaInfoName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  ustaInfoSpec: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 1,
  },
  ustaInfoOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ustaInfoOnlineText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  contactBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  statsBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 10,
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsDivider: {
    width: 1,
    height: 14,
  },
  statsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  addressText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
});
