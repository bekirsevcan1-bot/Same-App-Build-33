import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function IslerimScreen() {
  const colors = useColors();
  const router = useRouter();
  const { requests } = useApp();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>HESABINIZ</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>İşlerim</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Oluşturduğunuz ve takip ettiğiniz talepler</Text>
        {requests.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="briefcase" size={28} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz işiniz yok</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>İhtiyacınız olan hizmeti seçerek ilk talebinizi oluşturun.</Text>
            <TouchableOpacity onPress={() => router.push('/talep')} style={[styles.cta, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={17} color={colors.primaryForeground} /><Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Talep oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : requests.map((request) => (
          <TouchableOpacity key={request.id} onPress={() => router.push(`/talep/${request.id}`)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.icon, { backgroundColor: colors.primary + '18' }]}><Feather name="briefcase" size={18} color={colors.primary} /></View>
            <View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{request.title || request.categoryName}</Text><Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{request.status} · {request.semt || 'Antalya'}</Text></View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingTop: 55, paddingBottom: 100, gap: 8 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.2, marginBottom: 2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 16 },
  card: { minHeight: 68, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 8 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  cardMeta: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  empty: { borderWidth: 1, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8, marginTop: 8 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 4 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 6 },
  cta: { minHeight: 44, borderRadius: 11, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  ctaText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});