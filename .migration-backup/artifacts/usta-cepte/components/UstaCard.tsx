import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export interface Usta {
  id: number;
  name: string;
  specialty: string;
  categoryId: string;
  rating: number;
  reviewCount: number;
  priceMin: number;
  priceMax: number;
  verified: boolean;
  bio?: string;
  avatarUrl?: string;
  phone?: string | null;
  claimed?: boolean;
  canManage?: boolean;
}

interface Props {
  usta: Usta;
  onSelect?: () => void;
  selected?: boolean;
}

export function UstaCard({ usta, onSelect, selected }: Props) {
  const colors = useColors();

  const initials = usta.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>{usta.name}</Text>
          {usta.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: '#0A2515' }]}>
              <Feather name="check-circle" size={11} color="#34C759" />
              <Text style={styles.verifiedText}>Onaylı</Text>
            </View>
          )}
        </View>

        <Text style={[styles.specialty, { color: colors.mutedForeground }]}>{usta.specialty}</Text>

        <View style={styles.stats}>
          <View style={styles.ratingRow}>
            <Feather name="star" size={13} color="#F5A623" />
            <Text style={[styles.rating, { color: colors.foreground }]}>
              {usta.rating.toFixed(1)}
            </Text>
            <Text style={[styles.reviews, { color: colors.mutedForeground }]}>
              ({usta.reviewCount})
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.primary }]}>
            ₺{usta.priceMin} – ₺{usta.priceMax}
          </Text>
        </View>
      </View>

      {onSelect && (
        <View style={[styles.selectBtn, { backgroundColor: selected ? colors.primary : colors.secondary }]}>
          <Feather
            name={selected ? 'check' : 'chevron-right'}
            size={16}
            color={selected ? colors.primaryForeground : colors.mutedForeground}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#34C759',
  },
  specialty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  reviews: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  price: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  selectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
