import React, { useState } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { ANTALYA_NEIGHBORHOODS } from '@/constants/antalya-neighborhoods';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const BRANCHES = ['Elektrik', 'Su Tesisatı', 'Klima', 'Boya ve Badana Hizmetleri', 'Dekoratif Sıva Hizmetleri', 'Duvar Kağıdı Hizmetleri', 'Seramik', 'Anahtar & Çilingir', 'Isı Yalıtımı', 'Kaynak İşleri', 'Şap ve Saha Beton Hizmetleri', 'Mobilya Montaj ve Tamir Hizmetleri', 'Alçı ve Alçıpan Hizmetleri', 'Söve Uygulama', 'Çatı İşleri', 'Sundurma İşleri', 'Halı Yıkama Hizmetleri', 'Ev Temizliği'];
const DISTRICTS = Object.keys(ANTALYA_NEIGHBORHOODS).map((name) => ({
  id: name,
  name,
  neighborhoods: ANTALYA_NEIGHBORHOODS[name].map((neighborhood, index) => ({
    id: `${name}-${index}`,
    name: neighborhood,
    streets: [],
  })),
}));
const CLEANING_TEAM_SIZES = ['1 kişilik ekip', '2 kişilik ekip', '3 kişilik ekip'];

export default function KayitScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { deviceId } = useApp();
  const [cleaning, setCleaning] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>(['Muratpaşa']);
  const [areasConfirmed, setAreasConfirmed] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICTS[0]);
  const [teamSize, setTeamSize] = useState(CLEANING_TEAM_SIZES[0]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [bankTransfer, setBankTransfer] = useState<{ companyName: string; iban: string; referenceCode: string; configured: boolean } | null>(null);
  const districts = DISTRICTS;
  const selected = cleaning ? ['Ev Temizliği'] : specialties;

  const openBankTransfer = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/bank-transfer?user_id=${encodeURIComponent(deviceId)}`);
      if (response.ok) setBankTransfer(await response.json());
    } catch {
      setBankTransfer({ companyName: 'Usta Cepte', iban: '', referenceCode: '', configured: false });
    }
  };

  const submit = async () => {
    if (!name || !phone || !email || !password || serviceAreas.length === 0 || selected.length === 0 || !consent || !areasConfirmed) {
      Alert.alert('Eksik bilgi', 'Tüm zorunlu alanları doldurup KVKK onayını verin.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/register/craftsman`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
        body: JSON.stringify({ name, phone, email, password, district: serviceAreas[0], serviceAreas, specialty: selected[0], specialties: selected, about: cleaning ? `Ekip: ${teamSize}` : undefined, kvkkConsent: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Kayıt oluşturulamadı');
       Alert.alert(
         'Başvurunuz alındı',
         'Başvurunuz incelendikten sonra size bilgi verilecektir. Aynı cihazla müşteri olarak da hizmet talebi oluşturabilirsiniz.',
         [
           { text: 'Müşteri olarak hizmet al', onPress: () => router.replace('/(tabs)') },
           { text: 'Tamam', onPress: () => router.back() },
         ],
       );
    } catch (error) {
      Alert.alert('Kayıt yapılamadı', error instanceof Error ? error.message : 'Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  return <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={22} color={colors.foreground} /></TouchableOpacity>
      <Text style={[styles.title, { color: colors.foreground }]}>Profesyonel Başvuru</Text><View style={styles.back} />
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Hizmetinizi Antalya’daki müşterilerle buluşturun.</Text>
       <View style={[styles.subscriptionCard, { backgroundColor: colors.card, borderColor: colors.orange + '70' }]}>
         <Text style={[styles.subscriptionLabel, { color: colors.orange }]}>PROFESYONEL ÜYELİK</Text>
         <Text style={[styles.subscriptionTitle, { color: colors.foreground }]}>Usta Cepte hizmetlerini kullanmaya devam etmek için aylık kullanım bedeli 3.000 TL'dir.</Text>
         <Text style={[styles.subscriptionHint, { color: colors.mutedForeground }]}>Bu ödeme alanı müşteri dışındaki kayıt panelinde gösterilir.</Text>
         <View style={styles.subscriptionActions}>
           <TouchableOpacity onPress={() => Linking.openURL(`${API_BASE.replace(/\/$/, '')}/usta-cepte-web/pay?user_id=${encodeURIComponent(deviceId)}`)} style={[styles.subscriptionPay, { backgroundColor: colors.orange }]}><Text style={[styles.subscriptionPayText, { color: colors.primaryForeground }]}>Kredi / Banka Kartı ile Öde</Text></TouchableOpacity>
           <TouchableOpacity onPress={openBankTransfer} style={[styles.subscriptionTransfer, { borderColor: colors.primary }]}><Text style={[styles.subscriptionTransferText, { color: colors.primary }]}>IBAN / Havale ile Öde</Text></TouchableOpacity>
         </View>
       </View>
      <View style={styles.roleRow}>
        <TouchableOpacity onPress={() => setCleaning(false)} style={[styles.role, { backgroundColor: !cleaning ? colors.primary + '18' : colors.card, borderColor: !cleaning ? colors.primary : colors.border }]}><Feather name="tool" size={18} color={colors.primary}/><Text style={[styles.roleText, { color: colors.foreground }]}>Usta</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setCleaning(true)} style={[styles.role, { backgroundColor: cleaning ? colors.primary + '18' : colors.card, borderColor: cleaning ? colors.primary : colors.border }]}><Feather name="check-circle" size={18} color={colors.primary}/><Text style={[styles.roleText, { color: colors.foreground }]}>Ev Temizliği</Text></TouchableOpacity>
      </View>
      {[['Ad Soyad', name, setName, 'Adınız soyadınız'], ['Telefon', phone, setPhone, '05XX XXX XX XX'], ['E-posta', email, setEmail, 'ornek@mail.com'], ['Şifre', password, setPassword, 'En az 6 karakter']].map(([label, value, setter, placeholder]) => <View key={label as string}><Text style={[styles.label, { color: colors.foreground }]}>{label as string}</Text><TextInput value={value as string} onChangeText={setter as (v:string)=>void} placeholder={placeholder as string} placeholderTextColor={colors.mutedForeground} secureTextEntry={label === 'Şifre'} autoCapitalize="none" style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} /></View>)}
      <View>
         <View style={styles.regionHeader}><Text style={[styles.label, { color: colors.foreground }]}>Hizmet bölgeleri</Text><View style={{ flexDirection: 'row', gap: 10 }}><TouchableOpacity onPress={() => { setServiceAreas(districts.map((district) => district.name)); setAreasConfirmed(false); }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Tüm ilçeleri seç</Text></TouchableOpacity><TouchableOpacity onPress={() => { setServiceAreas([]); setAreasConfirmed(false); }}><Text style={{ color: colors.mutedForeground, fontWeight: '700', fontSize: 12 }}>Temizle</Text></TouchableOpacity></View></View>
        <View style={styles.branches}>{districts.map((district) => <TouchableOpacity key={district.id} onPress={() => { setSelectedDistrict(district); setServiceAreas((old) => old.includes(district.name) ? old.filter((x) => x !== district.name) : [...old, district.name]); }} style={[styles.branch, { backgroundColor: selectedDistrict.id === district.id ? colors.primary + '18' : colors.card, borderColor: selectedDistrict.id === district.id ? colors.primary : colors.border }]}><Text style={{ color: selectedDistrict.id === district.id ? colors.primary : colors.foreground }}>{district.name}</Text></TouchableOpacity>)}</View>
         <View style={styles.regionHeader}><Text style={[styles.label, { color: colors.foreground }]}>{selectedDistrict.name} mahalle / semtleri</Text><TouchableOpacity onPress={() => { setServiceAreas((old) => [...new Set([...old.filter((x) => !x.startsWith(`${selectedDistrict.name} /`)), selectedDistrict.name, ...selectedDistrict.neighborhoods.map((neighborhood) => `${selectedDistrict.name} / ${neighborhood.name}`)])]); setAreasConfirmed(false); }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Tümünü seç</Text></TouchableOpacity></View>
         <Text style={[styles.regionSummary, { color: colors.mutedForeground }]}>{serviceAreas.filter((item) => !item.includes(' / ')).length} ilçe geneli · {serviceAreas.filter((item) => item.includes(' / ')).length} mahalle seçildi</Text>
        <View style={styles.branches}>{selectedDistrict.neighborhoods.map((neighborhood) => { const value = `${selectedDistrict.name} / ${neighborhood.name}`; const selected = serviceAreas.includes(value); return <TouchableOpacity key={neighborhood.id} onPress={() => setServiceAreas((old) => selected ? old.filter((x) => x !== value) : [...old, value])} style={[styles.branch, { backgroundColor: selected ? colors.primary + '18' : colors.card, borderColor: selected ? colors.primary : colors.border }]}><Text style={{ color: selected ? colors.primary : colors.foreground }}>{neighborhood.name}</Text></TouchableOpacity>; })}</View>
      </View>
       <TouchableOpacity onPress={() => setAreasConfirmed(true)} style={[styles.confirmArea, { backgroundColor: areasConfirmed ? colors.primary + '18' : colors.primary }]}>
         <Feather name={areasConfirmed ? 'check-circle' : 'check'} size={17} color={areasConfirmed ? colors.primary : colors.primaryForeground} />
         <Text style={{ color: areasConfirmed ? colors.primary : colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 12 }}>{areasConfirmed ? 'Hizmet bölgeleri onaylandı' : 'Seçimleri onayla'}</Text>
       </TouchableOpacity>
       <Text style={[styles.label, { color: colors.foreground }]}>{cleaning ? 'Hizmet alanı' : 'Çalıştığınız branşlar'}</Text>
      {cleaning ? <><View style={[styles.fixed, { backgroundColor: colors.primary + '14' }]}><Text style={{ color: colors.primary }}>Ev Temizliği</Text></View><View style={styles.branches}>{CLEANING_TEAM_SIZES.map((size) => <TouchableOpacity key={size} onPress={() => setTeamSize(size)} style={[styles.branch, { backgroundColor: teamSize === size ? colors.primary + '18' : colors.card, borderColor: teamSize === size ? colors.primary : colors.border }]}><Text style={{ color: teamSize === size ? colors.primary : colors.foreground }}>{size}</Text></TouchableOpacity>)}</View></> : <View style={styles.branches}>{BRANCHES.filter((b) => b !== 'Ev Temizliği').map((branch) => <TouchableOpacity key={branch} onPress={() => setSpecialties((old) => old.includes(branch) ? old.filter((x) => x !== branch) : [...old, branch])} style={[styles.branch, { backgroundColor: specialties.includes(branch) ? colors.primary + '18' : colors.card, borderColor: specialties.includes(branch) ? colors.primary : colors.border }]}><Text style={{ color: specialties.includes(branch) ? colors.primary : colors.foreground }}>{branch}</Text></TouchableOpacity>)}</View>}
      <TouchableOpacity onPress={() => setConsent(!consent)} style={styles.consent}><Feather name={consent ? 'check-square' : 'square'} size={22} color={consent ? colors.primary : colors.mutedForeground}/><Text style={[styles.consentText, { color: colors.mutedForeground }]}>KVKK aydınlatma metnini ve kullanım koşullarını okudum, kişisel verilerimin işlenmesine onay veriyorum.</Text></TouchableOpacity>
      <TouchableOpacity onPress={submit} disabled={sending} style={[styles.submit, { backgroundColor: colors.primary, opacity: sending ? .6 : 1 }]}><Text style={[styles.submitText, { color: colors.primaryForeground }]}>{sending ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}</Text></TouchableOpacity>
     </ScrollView>
     <Modal visible={!!bankTransfer} transparent animationType="fade" onRequestClose={() => setBankTransfer(null)}>
       <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.card }]}>
         <TouchableOpacity style={styles.modalClose} onPress={() => setBankTransfer(null)}><Feather name="x" size={21} color={colors.mutedForeground} /></TouchableOpacity>
         <Text style={[styles.subscriptionLabel, { color: colors.orange }]}>HAVALE / EFT BİLGİLERİ</Text>
         <Text style={[styles.modalTitle, { color: colors.foreground }]}>{bankTransfer?.companyName}</Text>
         {bankTransfer?.configured ? <><Text style={[styles.modalKey, { color: colors.mutedForeground }]}>IBAN</Text><Text style={[styles.modalValue, { color: colors.foreground }]}>{bankTransfer.iban}</Text><Text style={[styles.modalKey, { color: colors.mutedForeground }]}>REFERANS KODUNUZ</Text><Text style={[styles.modalValue, { color: colors.foreground }]}>{bankTransfer.referenceCode}</Text></> : <Text style={[styles.modalHint, { color: colors.mutedForeground }]}>Şirket IBAN bilgisi henüz yapılandırılmadı. Lütfen destek ekibiyle iletişime geçin.</Text>}
         <TouchableOpacity onPress={() => setBankTransfer(null)} style={[styles.modalButton, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }}>Tamam</Text></TouchableOpacity>
       </View></View>
     </Modal>
  </View>;
}
  const styles = StyleSheet.create({ screen:{flex:1},header:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,borderBottomWidth:1},back:{width:36,alignItems:'center'},title:{fontFamily:'Inter_600SemiBold',fontSize:16},content:{padding:16,gap:13,paddingBottom:42},intro:{fontFamily:'Inter_400Regular',fontSize:13},subscriptionCard:{borderWidth:1,borderRadius:15,padding:14,gap:6},subscriptionLabel:{fontFamily:'Inter_700Bold',fontSize:10,letterSpacing:1},subscriptionTitle:{fontFamily:'Inter_600SemiBold',fontSize:13,lineHeight:18},subscriptionHint:{fontFamily:'Inter_400Regular',fontSize:11},subscriptionActions:{flexDirection:'row',gap:8,marginTop:6},subscriptionPay:{flex:1,minHeight:40,borderRadius:10,alignItems:'center',justifyContent:'center',paddingHorizontal:8},subscriptionPayText:{fontFamily:'Inter_700Bold',fontSize:11,textAlign:'center'},subscriptionTransfer:{flex:1,minHeight:40,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center',paddingHorizontal:8},subscriptionTransferText:{fontFamily:'Inter_700Bold',fontSize:11,textAlign:'center'},modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.58)',alignItems:'center',justifyContent:'center',padding:20},modalCard:{width:'100%',borderRadius:18,padding:22,gap:8},modalClose:{alignSelf:'flex-end',padding:2},modalTitle:{fontFamily:'Inter_700Bold',fontSize:20,marginBottom:8},modalKey:{fontFamily:'Inter_600SemiBold',fontSize:10,marginTop:6,letterSpacing:.8},modalValue:{fontFamily:'Inter_600SemiBold',fontSize:13},modalHint:{fontFamily:'Inter_400Regular',fontSize:12,lineHeight:18,marginTop:8},modalButton:{minHeight:44,borderRadius:11,alignItems:'center',justifyContent:'center',marginTop:14},roleRow:{flexDirection:'row',gap:10},role:{flex:1,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8,padding:13,borderRadius:12,borderWidth:1},roleText:{fontFamily:'Inter_600SemiBold'},label:{fontFamily:'Inter_600SemiBold',fontSize:12,marginBottom:6},regionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},regionSummary:{fontFamily:'Inter_400Regular',fontSize:11,marginTop:-5},confirmArea:{minHeight:42,borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},input:{borderWidth:1,borderRadius:11,paddingHorizontal:12,height:45,fontFamily:'Inter_400Regular'},branches:{flexDirection:'row',flexWrap:'wrap',gap:8},branch:{padding:9,borderRadius:9,borderWidth:1},fixed:{padding:12,borderRadius:10},consent:{flexDirection:'row',gap:10,alignItems:'flex-start'},consentText:{flex:1,fontFamily:'Inter_400Regular',fontSize:11,lineHeight:16},submit:{height:48,borderRadius:12,alignItems:'center',justifyContent:'center'},submitText:{fontFamily:'Inter_700Bold',fontSize:14} });