import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Platform,
  ImageBackground,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { CategoryItem } from '@/components/CategoryItem';
import { JobCard } from '@/components/JobCard';
import { CATEGORIES } from '@/constants/categories';

const TAB_BAR_HEIGHT = 80;

const PROMOTION_IMAGES = [
  'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85',
];
const PROMOTION_IMAGE_BY_ID: Record<string, string> = {
  elektrik: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=85',
  'su-tesisati': 'https://images.unsplash.com/photo-1607472586893-1d2c7e4f4a0b?auto=format&fit=crop&w=1200&q=85',
  klima: 'https://images.unsplash.com/photo-1631545806609-8b7e6f96c8a4?auto=format&fit=crop&w=1200&q=85',
  'klima-ariza-bakim': 'https://images.unsplash.com/photo-1631545806609-8b7e6f96c8a4?auto=format&fit=crop&w=1200&q=85',
  boya: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=85',
  'dekoratif-siva': 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85',
  'duvar-kagidi': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
  seramik: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85',
  fayans: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85',
  'laminat-parke': 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85',
  kaynak: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=85',
  'hali-yikama': 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=1200&q=85',
  'koltuk-yikama': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85',
  nakliye: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=85',
  'ev-temizligi': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85',
  cati: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=1200&q=85',
  mobilya: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85',
  dekorasyon: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
  alcipan: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85',
};
const PROMOTION_COLORS = ['#D8753B', '#177D73', '#B95E2E', '#3D526B', '#6D5A8E'];
const PROMOTIONS = CATEGORIES.map((category, index) => ({
  id: category.id,
  title: `${category.name} için doğru usta`,
  subtitle: `Antalya’da ${category.name.toLocaleLowerCase('tr-TR')} hizmeti alın`,
  image: PROMOTION_IMAGE_BY_ID[category.id] ?? PROMOTION_IMAGES[index % PROMOTION_IMAGES.length],
  color: PROMOTION_COLORS[index % PROMOTION_COLORS.length],
}));
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
type FeaturedUsta = { id: number; name: string; specialty: string; rating: number; reviewCount: number; isOnline: boolean };

export default function IslerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { requests, loadRequests, userName, setForm } = useApp();

  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedFilter, setSelectedFilter] = React.useState<string>('Tümü');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [featuredUstas, setFeaturedUstas] = React.useState<FeaturedUsta[]>([]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const FILTERS = ['Tümü', 'Beklemede', 'Devam Ediyor', 'Tamamlandı'];

  const filteredRequests =
    selectedFilter === 'Tümü'
      ? requests
      : requests.filter((r) => r.status === selectedFilter);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, [loadRequests]);

  React.useEffect(() => {
    fetch(`${API_BASE}/api/ustas`)
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setFeaturedUstas(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => setFeaturedUstas([]));
  }, []);

  const onCategoryPress = useCallback((cat: (typeof CATEGORIES)[0]) => {
    setSelectedCategories((current) => current.includes(cat.id)
      ? current.filter((id) => id !== cat.id)
      : [...current, cat.id]);
  }, []);

  const startSelectedRequests = useCallback(() => {
    const selected = CATEGORIES.filter((cat) => selectedCategories.includes(cat.id));
    if (!selected.length) return;
    setForm({
      categoryId: selected[0].id,
      categoryName: selected[0].name,
      selectedCategoryIds: selected.map((cat) => cat.id),
      selectedCategoryNames: selected.map((cat) => cat.name),
    });
    router.push('/talep');
  }, [selectedCategories, setForm, router]);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Günaydın' : greetingHour < 18 ? 'İyi günler' : 'İyi akşamlar';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: TAB_BAR_HEIGHT + bottomPad + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {greeting} 👋
            </Text>
            <Text style={[styles.headline, { color: colors.foreground }]}>
              Neye ihtiyacınız var?
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/ayarlar')}
            activeOpacity={0.75}
            style={[styles.settingsButton, { borderColor: colors.border }]}
            accessibilityLabel="Ayarlar"
          >
            <Feather name="settings" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Active request banner */}
        <TouchableOpacity onPress={() => router.push('/kayit')} activeOpacity={0.8} style={[styles.professionalBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.professionalIcon, { backgroundColor: colors.primary + '18' }]}><Feather name="tool" size={18} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><Text style={[styles.professionalTitle, { color: colors.foreground }]}>Usta veya Ev Temizliği hizmeti mi veriyorsunuz?</Text><Text style={[styles.professionalText, { color: colors.mutedForeground }]}>Telefondan profesyonel başvurunuzu yapın</Text></View>
          <Feather name="chevron-right" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.promoSection}>
          <View style={styles.promoHeader}>
            <View>
              <Text style={[styles.promoEyebrow, { color: colors.primary }]}>USTA CEPTE’DE ÖNE ÇIKANLAR</Text>
              <Text style={[styles.promoTitle, { color: colors.foreground }]}>İşiniz için doğru usta burada</Text>
            </View>
            <Text style={[styles.promoHint, { color: colors.mutedForeground }]}>Kaydırın</Text>
          </View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoList}>
            {PROMOTIONS.map((promo) => (
              <TouchableOpacity
                key={promo.id}
                activeOpacity={0.9}
                onPress={() => {
                  const category = CATEGORIES.find((cat) => cat.id === promo.id);
                  if (category) {
                    setForm({ categoryId: category.id, categoryName: category.name, selectedCategoryIds: [category.id], selectedCategoryNames: [category.name] });
                    router.push('/talep');
                  }
                }}
                style={styles.promoCard}
              >
                <ImageBackground source={{ uri: promo.image }} imageStyle={styles.promoImage} style={styles.promoImage}>
                  <View style={[styles.promoShade, { backgroundColor: promo.color + 'AA' }]} />
                  <View style={styles.promoCopy}>
                    <Text style={styles.promoBadge}>SPONSORLU HİZMET</Text>
                    <Text style={styles.promoCardTitle}>{promo.title}</Text>
                    <Text style={styles.promoCardSubtitle}>{promo.subtitle}</Text>
                    <View style={styles.promoAction}><Text style={styles.promoActionText}>Usta bul</Text><Feather name="arrow-up-right" size={14} color="#17202C" /></View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.customerNoticeSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sizin için seçtik</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/bildirimler')} style={[styles.customerNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.customerNoticeIcon, { backgroundColor: colors.orange + '20' }]}><Feather name="percent" size={17} color={colors.orange} /></View>
            <View style={styles.customerNoticeCopy}><Text style={[styles.customerNoticeTitle, { color: colors.foreground }]}>Usta Cepte fırsatları</Text><Text style={[styles.customerNoticeText, { color: colors.mutedForeground }]}>Seçili hizmetlerde indirimleri ve avantajlı teklifleri keşfedin.</Text></View>
            <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/bildirimler')} style={[styles.customerNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.customerNoticeIcon, { backgroundColor: '#F5A62320' }]}><Feather name="star" size={17} color="#F5A623" /></View>
            <View style={styles.customerNoticeCopy}><Text style={[styles.customerNoticeTitle, { color: colors.foreground }]}>Yüksek puanlı ustalar</Text><Text style={[styles.customerNoticeText, { color: colors.mutedForeground }]}>Gerçek müşterilerden yüksek yıldız alan ustaları görün.</Text></View>
            <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        {featuredUstas.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Yüksek puanlı ustalar</Text><Text style={[styles.serviceHint, { color: colors.mutedForeground }]}>Antalya’da güvenle hizmet alın</Text></View><Feather name="award" size={20} color="#F5A623" /></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
              {featuredUstas.map((usta) => (
                <TouchableOpacity key={usta.id} activeOpacity={0.8} onPress={() => router.push(`/usta/${usta.id}`)} style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.featuredAvatar}><Feather name="user" size={21} color={colors.primary} /></View>
                  <Text numberOfLines={1} style={[styles.featuredName, { color: colors.foreground }]}>{usta.name}</Text>
                  <Text numberOfLines={1} style={[styles.featuredSpecialty, { color: colors.mutedForeground }]}>{usta.specialty}</Text>
                  <View style={styles.featuredRating}><Feather name="star" size={13} color="#F5A623" /><Text style={[styles.featuredRatingText, { color: colors.foreground }]}>{usta.rating.toFixed(1)} · {usta.reviewCount} yorum</Text></View>
                  <View style={[styles.onlinePill, { backgroundColor: usta.isOnline ? colors.green + '18' : colors.border }]}><Text style={{ color: usta.isOnline ? colors.green : colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>{usta.isOnline ? 'Şu an müsait' : 'Profilini gör'}</Text></View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {requests.filter((r) => r.status === 'Devam Ediyor').length > 0 && (
          <View style={[styles.activeBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
            <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.activeBannerText, { color: colors.primary }]}>
              {requests.filter((r) => r.status === 'Devam Ediyor').length} aktif talebiniz devam ediyor
            </Text>
            <Feather name="chevron-right" size={16} color={colors.primary} />
          </View>
        )}

        {/* Service Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Hizmet Türü</Text>
              <Text style={[styles.serviceHint, { color: colors.mutedForeground }]}>Birden fazla iş için 3–4 veya daha fazla seçenek seçebilirsiniz</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Tümünü gör</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <CategoryItem
                key={cat.id}
                category={cat}
                onPress={() => onCategoryPress(cat)}
                size="lg"
                selected={selectedCategories.includes(cat.id)}
              />
            ))}
          </View>
          {selectedCategories.length > 0 && (
            <TouchableOpacity onPress={startSelectedRequests} activeOpacity={0.85} style={[styles.multiRequestButton, { backgroundColor: colors.primary }]}>
              <Feather name="plus-circle" size={17} color={colors.primaryForeground} />
              <Text style={[styles.multiRequestText, { color: colors.primaryForeground }]}>
                {selectedCategories.length} hizmet için talep oluştur
              </Text>
              <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Feather name="zap" size={18} color={colors.primary} />
            <Text style={[styles.statNum, { color: colors.foreground }]}>{requests.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Talep</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Feather name="check-circle" size={18} color={colors.green} />
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {requests.filter((r) => r.status === 'Tamamlandı').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Tamamlandı</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Feather name="clock" size={18} color={colors.orange} />
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {requests.filter((r) => r.status === 'Beklemede').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Beklemede</Text>
          </View>
        </View>

        {/* Requests list */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Son Taleplerim</Text>

          {/* Filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setSelectedFilter(f)}
                activeOpacity={0.7}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: selectedFilter === f ? colors.primary : colors.card,
                    borderColor: selectedFilter === f ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: selectedFilter === f ? colors.primaryForeground : colors.mutedForeground,
                    },
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredRequests.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Talep bulunamadı</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Yeni talep oluşturmak için + butonuna dokunun
              </Text>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {filteredRequests.map((req) => (
                <JobCard key={req.id} request={req} onPress={() => router.push(`/talep/${req.id}`)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginBottom: 2,
  },
  headline: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  professionalBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  professionalIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  professionalTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  professionalText: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  promoSection: { gap: 10 },
  promoHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  promoEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.7 },
  promoTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 3 },
  promoHint: { fontFamily: 'Inter_500Medium', fontSize: 11, marginBottom: 2 },
  promoList: { gap: 10 },
  promoCard: { width: 316, height: 174, borderRadius: 18, overflow: 'hidden' },
  promoImage: { flex: 1, justifyContent: 'flex-end' },
  promoShade: { ...StyleSheet.absoluteFillObject },
  promoCopy: { padding: 16, gap: 5 },
  promoBadge: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },
  promoCardTitle: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 21, lineHeight: 25, maxWidth: 250 },
  promoCardSubtitle: { color: 'rgba(255,255,255,0.88)', fontFamily: 'Inter_400Regular', fontSize: 11 },
  promoAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: '#FFF' },
  promoActionText: { color: '#17202C', fontFamily: 'Inter_700Bold', fontSize: 11 },
  customerNoticeSection: { gap: 9 },
  customerNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  customerNoticeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  customerNoticeCopy: { flex: 1 },
  customerNoticeTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  customerNoticeText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 2 },
  featuredSection: { gap: 10 },
  featuredList: { gap: 10 },
  featuredCard: { width: 166, padding: 13, borderRadius: 15, borderWidth: 1, gap: 5 },
  featuredAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F7A6318' },
  featuredName: { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 2 },
  featuredSpecialty: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  featuredRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredRatingText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  onlinePill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 99, marginTop: 2 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeBannerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
  },
  serviceHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 3,
  },
  multiRequestButton: {
    minHeight: 48,
    borderRadius: 14,
    marginTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  multiRequestText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    flex: 1,
  },
  seeAll: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 14,
    borderRadius: 14,
  },
  statNum: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  filters: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  jobsList: {
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginTop: 4,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
});
