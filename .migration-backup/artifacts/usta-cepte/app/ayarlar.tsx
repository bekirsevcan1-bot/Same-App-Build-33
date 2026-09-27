import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function AyarlarScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { deviceId, userName, setUserName, requests, unreadNotificationCount } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(userName);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem('profilePhoto').then(setProfilePhoto);
  }, []);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [mediaEnabled, setMediaEnabled] = useState(true);

  const deleteAccount = async () => {
        setDeleting(true);
        try {
          const response = await fetch(`${API_BASE}/api/devices/me`, { method: 'DELETE', headers: { 'x-device-id': deviceId } });
          if (!response.ok) throw new Error();
          await AsyncStorage.multiRemove(['deviceId', 'userName']);
          router.replace('/(tabs)');
        } catch {
          Alert.alert('İşlem başarısız', 'Hesabınız silinemedi. Lütfen tekrar deneyin.');
        } finally {
          setDeleting(false);
        }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('userName');
    setUserName('Misafir');
    router.replace('/(tabs)');
  };

  const saveProfile = () => {
    const nextName = draftName.trim();
    if (!nextName) {
      Alert.alert('Eksik bilgi', 'Lütfen adınızı yazın.');
      return;
    }
    setUserName(nextName);
    setEditingProfile(false);
  };

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Profil fotoğrafı eklemek için galeri izni vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const uri = result.canceled ? null : result.assets[0]?.uri;
    if (uri) {
      setProfilePhoto(uri);
      await AsyncStorage.setItem('profilePhoto', uri);
    }
  };

  return <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={colors.foreground} /></TouchableOpacity>
      <Text style={[styles.title, { color: colors.foreground }]}>Hesabım</Text><View style={{ width: 22 }} />
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.section, { color: colors.mutedForeground }]}>HESAP</Text>
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
         <TouchableOpacity onPress={() => void pickProfilePhoto()} style={[styles.avatar, { backgroundColor: colors.primary + '20' }]} accessibilityLabel="Profil fotoğrafı ekle">
           {profilePhoto ? <Image source={{ uri: profilePhoto }} style={styles.avatarImage} /> : <Feather name="camera" size={21} color={colors.primary} />}
         </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{userName || 'Misafir'}</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Usta Cepte hesabı</Text>
        </View>
         <TouchableOpacity onPress={() => { setDraftName(userName); setEditingProfile(true); }} style={[styles.editButton, { borderColor: colors.border, backgroundColor: colors.background }]}>
           <Feather name="edit-2" size={14} color={colors.primary} />
           <Text style={[styles.editButtonText, { color: colors.primary }]}>Düzenle</Text>
         </TouchableOpacity>
      </View>
       <View style={[styles.accountStats, { borderTopColor: colors.border }]}>
         <View style={styles.accountStat}><Text style={[styles.accountStatValue, { color: colors.foreground }]}>{requests.length}</Text><Text style={[styles.accountStatLabel, { color: colors.mutedForeground }]}>Talep</Text></View>
         <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
         <View style={styles.accountStat}><Text style={[styles.accountStatValue, { color: colors.foreground }]}>{requests.filter((request) => ['pending', 'searching', 'accepted', 'in_progress'].includes(request.status)).length}</Text><Text style={[styles.accountStatLabel, { color: colors.mutedForeground }]}>Aktif iş</Text></View>
         <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
         <View style={styles.accountStat}><Text style={[styles.accountStatValue, { color: colors.foreground }]}>{unreadNotificationCount}</Text><Text style={[styles.accountStatLabel, { color: colors.mutedForeground }]}>Bildirim</Text></View>
       </View>

       <Text style={[styles.section, { color: colors.mutedForeground }]}>HESAP İŞLEMLERİ</Text>
       <View style={[styles.accountActionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
         <TouchableOpacity onPress={() => void signOut()} style={styles.accountActionRow} accessibilityLabel="Uygulamadan çıkış yap">
           <View style={[styles.accountActionIcon, { backgroundColor: colors.primary + '18' }]}><Feather name="log-out" size={18} color={colors.primary} /></View>
           <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Uygulamadan çıkış yap</Text><Text style={[styles.hint, { color: colors.mutedForeground }]}>Bu cihazdaki oturumu kapat</Text></View>
           <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
         </TouchableOpacity>
         <View style={[styles.divider, { backgroundColor: colors.border }]} />
         <TouchableOpacity disabled={deleting} onPress={() => void deleteAccount()} style={styles.accountActionRow} accessibilityLabel="Hesabımı ve verilerimi sil">
           <View style={[styles.accountActionIcon, { backgroundColor: colors.destructive + '15' }]}><Feather name="trash-2" size={18} color={colors.destructive} /></View>
           <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.destructive }]}>Hesabımı ve verilerimi sil</Text><Text style={[styles.hint, { color: colors.mutedForeground }]}>{deleting ? 'Siliniyor...' : 'Hesabınızı ve bağlı verileri kalıcı olarak kaldır'}</Text></View>
           <Feather name="chevron-right" size={18} color={colors.destructive} />
         </TouchableOpacity>
       </View>

       <Text style={[styles.section, { color: colors.mutedForeground }]}>TALEPLERİM</Text>
       <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
         {requests.length === 0 ? (
           <View style={styles.emptyAccount}><Feather name="clipboard" size={19} color={colors.mutedForeground} /><Text style={[styles.hint, { color: colors.mutedForeground }]}>Henüz oluşturulmuş talebiniz yok.</Text><TouchableOpacity onPress={() => router.push('/talep')}><Text style={[styles.accountLink, { color: colors.primary }]}>İlk talebi oluştur</Text></TouchableOpacity></View>
         ) : requests.slice(0, 3).map((request) => (
           <TouchableOpacity key={request.id} onPress={() => router.push(`/talep/${request.id}`)} style={styles.requestRow}>
             <View style={[styles.requestIcon, { backgroundColor: colors.primary + '18' }]}><Feather name="briefcase" size={16} color={colors.primary} /></View>
             <View style={styles.settingCopy}><Text numberOfLines={1} style={[styles.settingTitle, { color: colors.foreground }]}>{request.title || request.categoryName}</Text><Text style={[styles.hint, { color: colors.mutedForeground }]}>{request.status} · {request.semt || 'Antalya'}</Text></View>
             <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
           </TouchableOpacity>
         ))}
       </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>TERCİHLER</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <Feather name="bell" size={18} color={colors.primary} />
          <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Bildirimler</Text><Text style={[styles.hint, { color: colors.mutedForeground }]}>Talep ve usta güncellemelerini al</Text></View>
          <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: colors.border, true: colors.primary + '70' }} thumbColor={notificationsEnabled ? colors.primary : colors.mutedForeground} />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.settingRow}>
          <Feather name="map-pin" size={18} color={colors.primary} />
          <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Konum hizmetleri</Text><Text style={[styles.hint, { color: colors.mutedForeground }]}>Yakındaki ustalar ve canlı takip</Text></View>
          <Switch value={locationEnabled} onValueChange={setLocationEnabled} trackColor={{ false: colors.border, true: colors.primary + '70' }} thumbColor={locationEnabled ? colors.primary : colors.mutedForeground} />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.settingRow}>
          <Feather name="image" size={18} color={colors.primary} />
          <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Fotoğraf ve video izinleri</Text><Text style={[styles.hint, { color: colors.mutedForeground }]}>Talep eklerine medya yükleme</Text></View>
          <Switch value={mediaEnabled} onValueChange={setMediaEnabled} trackColor={{ false: colors.border, true: colors.primary + '70' }} thumbColor={mediaEnabled ? colors.primary : colors.mutedForeground} />
        </View>
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>KVKK VE GİZLİLİK</Text>
      <View style={[styles.legalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.legalTitle, { color: colors.foreground }]}>KVKK aydınlatma metni</Text>
        <Text style={[styles.legalText, { color: colors.mutedForeground }]}>Kimlik, iletişim, adres, konum ve talep bilgileriniz; hizmet eşleştirme, güvenlik, bildirim ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla, 6698 sayılı KVKK kapsamında işlenir.</Text>
        <Text style={[styles.legalTitle, { color: colors.foreground }]}>Gizlilik ve veri kullanımı</Text>
        <Text style={[styles.legalText, { color: colors.mutedForeground }]}>Bilgileriniz yalnızca talebinizle ilgili usta veya hizmet sağlayıcıyla, gerekli olduğu ölçüde paylaşılır. Konum ve medya erişimleri tercihlerinizden kapatılabilir.</Text>
        <Text style={[styles.legalTitle, { color: colors.foreground }]}>Veri haklarınız</Text>
        <Text style={[styles.legalText, { color: colors.mutedForeground }]}>Kişisel verilerinize erişme, düzeltme, silme, işlenmesini kısıtlama ve açık rızanızı geri çekme talepleriniz için destek kanallarından bize ulaşabilirsiniz.</Text>
      </View>

     </ScrollView>
     <Modal visible={editingProfile} transparent animationType="fade" onRequestClose={() => setEditingProfile(false)}>
       <View style={styles.modalBackdrop}>
         <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
           <TouchableOpacity onPress={() => setEditingProfile(false)} style={styles.modalClose}><Feather name="x" size={20} color={colors.mutedForeground} /></TouchableOpacity>
           <Text style={[styles.modalTitle, { color: colors.foreground }]}>Profili düzenle</Text>
           <Text style={[styles.modalHint, { color: colors.mutedForeground }]}>Ana ekranda ve taleplerinizde görünecek adınızı güncelleyin.</Text>
           <Text style={[styles.inputLabel, { color: colors.foreground }]}>Ad Soyad</Text>
           <TextInput autoFocus value={draftName} onChangeText={setDraftName} placeholder="Adınız soyadınız" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
           <TouchableOpacity onPress={saveProfile} style={[styles.saveButton, { backgroundColor: colors.primary }]}>
             <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 13 }}>Kaydet</Text>
           </TouchableOpacity>
         </View>
       </View>
     </Modal>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { height: 58, borderBottomWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 16 }, content: { padding: 16, gap: 12, paddingBottom: 32 }, section: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.6, marginTop: 8 },
  profileCard: { borderWidth: 1, borderRadius: 13, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, profileName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 }, editButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, borderWidth: 1 }, editButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 }, accountStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, paddingTop: 12, marginTop: 13 }, accountStat: { alignItems: 'center', gap: 2, minWidth: 58 }, accountStatValue: { fontFamily: 'Inter_700Bold', fontSize: 17 }, accountStatLabel: { fontFamily: 'Inter_400Regular', fontSize: 10 }, statDivider: { width: 1, height: 25 }, requestCard: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 14 }, requestRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 0 }, requestIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, emptyAccount: { alignItems: 'center', paddingVertical: 20, gap: 7 }, accountLink: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  accountActionsCard: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 14 }, accountActionRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11 }, accountActionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingsCard: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 14 }, settingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11 }, settingCopy: { flex: 1 }, settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 }, hint: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 }, divider: { height: 1 },
  legalCard: { borderWidth: 1, borderRadius: 13, padding: 14, gap: 7 }, legalTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 2 }, legalText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  actionButton: { minHeight: 56, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteButton: { borderWidth: 1, borderRadius: 13, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }, deleteTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 }, deleteHint: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center', padding: 20 }, modalCard: { width: '100%', borderRadius: 18, padding: 20, gap: 9 }, modalClose: { alignSelf: 'flex-end', padding: 2 }, modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 }, modalHint: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 }, inputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 5 }, input: { height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Inter_400Regular' }, saveButton: { height: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
});