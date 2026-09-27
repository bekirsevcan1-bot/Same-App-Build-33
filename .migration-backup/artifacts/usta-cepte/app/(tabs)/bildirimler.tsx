import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';

const STATUS_MESSAGES: Record<string, string> = {
  Beklemede: 'Talebiniz alındı; uygun uzmanları arıyoruz.',
  'Devam Ediyor': 'Talebiniz için çalışma başladı.',
  Tamamlandı: 'Talebiniz tamamlandı.',
  İptal: 'Talebiniz iptal edildi.',
};

export interface DynamicNotification {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  type: 'STATUS' | 'JOB_ALERT' | 'SYSTEM';
  actionUrl?: string;
  read: boolean;
  sourceId?: number;
}

function timeAgo(value: string): string {
  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} saat önce`;
  return date.toLocaleDateString('tr-TR');
}

function mapNotification(notification: { id: number; title: string; body: string; type: string; createdAt: string; read: boolean; requestId?: number | null; ustaId?: number | null }): DynamicNotification | null {
  // Teklif, indirim ve fiyat içeren bildirimler kullanıcı akışında gösterilmez.
  if (notification.type === 'customer_discount' || notification.type === 'customer_top_rated') return null;
  return {
    id: String(notification.id),
    title: notification.title,
    message: notification.body,
    timeAgo: timeAgo(notification.createdAt),
    type: notification.requestId ? 'STATUS' : 'SYSTEM',
    actionUrl: notification.requestId ? `/talep/${notification.requestId}` : notification.ustaId ? `/usta/${notification.ustaId}` : undefined,
    read: notification.read,
    sourceId: notification.id,
  };
}

export default function BildirimlerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { requests, loadRequests, notifications, loadNotifications, markNotificationRead } = useApp();
  const visibleNotifications = notifications.filter((notification) => notification.type !== 'customer_discount' && notification.type !== 'customer_top_rated');

  useEffect(() => {
    loadRequests();
    loadNotifications();
  }, [loadRequests, loadNotifications]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '18' }]}>
          <Feather name="bell" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Bildirimler</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Taleplerinizle ilgili güncellemeler</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {visibleNotifications.length === 0 && requests.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bell-off" size={30} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz bildirim yok</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Yeni talep ve durum güncellemeleri burada görünecek.</Text>
          </View>
        ) : visibleNotifications.map((notification) => {
          const item = mapNotification(notification);
          if (!item) return null;
          return (
          <TouchableOpacity key={`notification-${notification.id}`} onPress={() => {
            void markNotificationRead(notification.id);
            if (item.actionUrl) router.push(item.actionUrl as never);
          }} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: notification.read ? 0.72 : 1 }]}>
            <View style={[styles.itemIcon, { backgroundColor: notification.read ? colors.border : colors.orange + '25' }]}>
              <Feather name={item.type === 'STATUS' ? 'truck' : item.type === 'JOB_ALERT' ? 'briefcase' : 'info'} size={18} color={notification.read ? colors.mutedForeground : colors.orange} />
            </View>
            <View style={styles.itemBody}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.itemText, { color: colors.mutedForeground }]}>{item.message}</Text>
              <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{new Date(notification.createdAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })} · {item.timeAgo}</Text>
            </View>
          </TouchableOpacity>
        )}).concat(requests.map((request) => (
          <TouchableOpacity key={request.id} onPress={() => router.push(`/talep/${request.id}`)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.itemIcon, { backgroundColor: colors.primary + '18' }]}>
              <Feather name={request.status === 'Tamamlandı' ? 'check-circle' : 'info'} size={18} color={colors.primary} />
            </View>
            <View style={styles.itemBody}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]}>Talep güncellemesi</Text>
              <Text style={[styles.itemText, { color: colors.mutedForeground }]}>
                {request.title}: {STATUS_MESSAGES[request.status] ?? `Durum: ${request.status}`}
              </Text>
              <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
                {new Date(request.updatedAt || request.createdAt).toLocaleString('tr-TR')}
              </Text>
            </View>
          </TouchableOpacity>
        )))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1 },
  headerIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  content: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  itemIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1 },
  itemTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  itemText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 3 },
  itemDate: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 6 },
  empty: { alignItems: 'center', gap: 8, padding: 30, borderRadius: 16, borderWidth: 1 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center' },
});