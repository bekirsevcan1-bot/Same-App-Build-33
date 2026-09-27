/**
 * Web preview — react-native-maps is native-only.
 * On iOS/Android (Expo Go or production build), harita.tsx is used.
 * This stub provides a usable web fallback.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/constants/categories';

const TAB_BAR_HEIGHT = 80;

const ANTALYA_DISTRICTS_COORDS = [
  { name: 'Muratpaşa', lat: 36.8984, lng: 30.7117 },
  { name: 'Kepez', lat: 36.9285, lng: 30.6904 },
  { name: 'Konyaaltı', lat: 36.8731, lng: 30.6487 },
  { name: 'Aksu', lat: 36.9021, lng: 30.7512 },
  { name: 'Döşemealtı', lat: 37.0056, lng: 30.6543 },
  { name: 'Alanya', lat: 36.5455, lng: 32.0015 },
  { name: 'Manavgat', lat: 36.7797, lng: 31.4404 },
  { name: 'Serik', lat: 36.9168, lng: 31.1023 },
  { name: 'Kemer', lat: 36.5991, lng: 30.5581 },
];

export default function HaritaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ustaLocations } = useApp();

  const [filterCat, setFilterCat] = useState<string | null>(null);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const displayedLocations = filterCat
    ? ustaLocations.filter((l) => l.categoryId === filterCat)
    : ustaLocations;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: TAB_BAR_HEIGHT + bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Harita</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Antalya bölgesi — Canlı usta konumları
            </Text>
          </View>
          <View style={[styles.liveBadge, { backgroundColor: '#0A2015' }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.liveText, { color: colors.green }]}>CANLI</Text>
          </View>
        </View>

        {/* Map placeholder */}
        <View style={[styles.mapPlaceholder, { backgroundColor: '#0d1b2a', borderColor: colors.border }]}>
          {/* Stylized Antalya map */}
          <View style={styles.mapGrid}>
            {ANTALYA_DISTRICTS_COORDS.map((d) => (
              <View key={d.name} style={styles.districtPin}>
                <View style={[styles.pinDot, { backgroundColor: colors.primary + '80' }]} />
                <Text style={[styles.districtLabel, { color: colors.mutedForeground }]}>
                  {d.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Usta markers on the placeholder map */}
          {displayedLocations.map((loc) => {
            const cat = CATEGORIES.find((c) => c.id === loc.categoryId);
            return (
              <View key={loc.ustaId} style={styles.ustaPin}>
                <View style={[styles.ustaPinDot, { backgroundColor: cat?.color ?? colors.primary }]}>
                  <Feather name={(cat?.icon ?? 'tool') as any} size={10} color="#fff" />
                </View>
              </View>
            );
          })}

          {/* Info overlay */}
          <View style={[styles.mapInfo, { backgroundColor: colors.card + 'CC' }]}>
            <Feather name="smartphone" size={14} color={colors.primary} />
            <Text style={[styles.mapInfoText, { color: colors.foreground }]}>
              Tam harita için Expo Go ile QR tarayın
            </Text>
          </View>
        </View>

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <TouchableOpacity
            onPress={() => setFilterCat(null)}
            style={[
              styles.filterChip,
              { backgroundColor: filterCat === null ? colors.primary : colors.card, borderColor: filterCat === null ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.filterText, { color: filterCat === null ? colors.primaryForeground : colors.foreground }]}>
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
                  styles.filterChip,
                  {
                    backgroundColor: filterCat === cat.id ? cat.color : colors.card,
                    borderColor: filterCat === cat.id ? cat.color : colors.border,
                  },
                ]}
              >
                <Feather name={cat.icon as any} size={12} color={filterCat === cat.id ? '#fff' : cat.color} />
                <Text style={[styles.filterText, { color: filterCat === cat.id ? '#fff' : colors.foreground }]}>
                  {cat.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active usta list */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Aktif Ustalar ({displayedLocations.length})
          </Text>
          {displayedLocations.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="map-pin" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Aktif usta bulunamadı
              </Text>
            </View>
          ) : (
            displayedLocations.map((loc) => {
              const cat = CATEGORIES.find((c) => c.id === loc.categoryId);
              return (
                <View
                  key={loc.ustaId}
                  style={[styles.ustaRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.ustaIcon, { backgroundColor: cat?.bgColor ?? colors.secondary }]}>
                    <Feather name={(cat?.icon ?? 'tool') as any} size={16} color={cat?.color ?? colors.primary} />
                  </View>
                  <View style={styles.ustaInfo}>
                    <Text style={[styles.ustaName, { color: colors.foreground }]}>{loc.ustaName}</Text>
                    <Text style={[styles.ustaSpec, { color: colors.mutedForeground }]}>{loc.specialty}</Text>
                  </View>
                  <View style={[styles.onlineBadge, { backgroundColor: '#0A2015' }]}>
                    <View style={[styles.onlineDot, { backgroundColor: colors.green }]} />
                    <Text style={[styles.onlineText, { color: colors.green }]}>Aktif</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* GPS info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="navigation" size={16} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>GPS Konum Takibi</Text>
            <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>
              Expo Go ile cihazınızda açtığınızda en yüksek GPS hassasiyetiyle (Accuracy.Highest) konumunuz otomatik algılanır ve Google Maps üzerinde gösterilir.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  mapPlaceholder: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  districtPin: { alignItems: 'center', gap: 3 },
  pinDot: { width: 8, height: 8, borderRadius: 4 },
  districtLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  ustaPin: { position: 'absolute', top: 20, left: 30 },
  ustaPinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  mapInfoText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 },
  filters: { gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  empty: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  ustaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  ustaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ustaInfo: { flex: 1 },
  ustaName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  ustaSpec: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  infoDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4, lineHeight: 18 },
});
