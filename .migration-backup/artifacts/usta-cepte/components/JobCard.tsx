import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES } from '@/constants/categories';
import type { ServiceRequest } from '@/context/AppContext';

interface Props {
  request: ServiceRequest;
  onPress?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  Beklemede: { label: 'Beklemede', color: '#FF9500', bgColor: '#2A1A00' },
  'Devam Ediyor': { label: 'Devam Ediyor', color: '#0A84FF', bgColor: '#0A1A2A' },
  Tamamlandı: { label: 'Tamamlandı', color: '#34C759', bgColor: '#0A2015' },
  İptal: { label: 'İptal', color: '#FF453A', bgColor: '#2A0A0A' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

export function JobCard({ request, onPress }: Props) {
  const colors = useColors();
  const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG['Beklemede']!;
  const category = CATEGORIES.find((c) => c.id === request.categoryId);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {category && (
            <View style={[styles.catIcon, { backgroundColor: category.bgColor }]}>
              <Feather name={category.icon as any} size={14} color={category.color} />
            </View>
          )}
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {request.title}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusCfg.bgColor }]}>
          <Text style={[styles.badgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {request.mahalle}, {request.semt}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {timeAgo(request.createdAt)}
          </Text>
        </View>
      </View>

      {request.priority === 'Acil' && (
        <View style={styles.urgentBanner}>
          <Feather name="alert-triangle" size={11} color="#FF453A" />
          <Text style={styles.urgentText}>Acil Talep</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  catIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  urgentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#FF453A',
  },
});
