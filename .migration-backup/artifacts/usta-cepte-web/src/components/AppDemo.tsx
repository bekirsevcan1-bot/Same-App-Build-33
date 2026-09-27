import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Zap, Droplet, Building2, Paintbrush, LayoutGrid, Grid3x3,
  MapPin, Bell, ArrowLeft, Check, Clock, Camera, ChevronRight,
  Home as HomeIcon, Briefcase, Map as MapIcon, Plus, Star, ShieldCheck,
  Radio, AlertTriangle, CalendarClock, Layers, Hammer, Wrench,
  Ruler, Settings, Palette, SprayCan, Truck, Phone, PhoneCall, User,
  Repeat, ArrowRight, Trash2,
  LocateFixed, X, LogOut, CircleAlert, Image as ImageIcon
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { createServiceRequest, isPrivilegedAdminEmail, sendPasswordReset, signInWithPassword, signOut as supabaseSignOut, updateServiceRequestAction, type RequestAction, subscribeToRequestUpdates } from "@/lib/supabase";
import { appPath } from "@/lib/navigation";
import { SupportChat } from "@/components/SupportChat";
import { PrivacyContent } from "@/components/PrivacyContent";

// ─── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "alcipan", label: "Alçı ve Alçıpan Hizmetleri", icon: Layers },
  { key: "sove", label: "Söve Uygulama", icon: HomeIcon },
  { key: "boya", label: "Boya ve Badana Hizmetleri", icon: Paintbrush },
  { key: "dekoratif_siva", label: "Dekoratif Sıva Hizmetleri", icon: Layers },
  { key: "duvar_kagidi", label: "Duvar Kağıdı Hizmetleri", icon: Paintbrush },
  { key: "isi_yalitimi", label: "Isı Yalıtımı", icon: Layers },
  { key: "tadilat", label: "Tadilat", icon: Hammer },
  { key: "tamirat", label: "Tamirat", icon: Wrench },
  { key: "tesisat", label: "Tesisat", icon: Droplet },
  { key: "klima_ariza_bakim", label: "Klima Arıza ve Bakım", icon: Settings },
  { key: "beyaz_esya", label: "Beyaz Eşya Tamiri", icon: Settings },
  { key: "elektrik", label: "Elektrik", icon: Zap },
  { key: "seramik", label: "Seramik", icon: LayoutGrid },
  { key: "fayans", label: "Fayans", icon: Grid3x3 },
  { key: "laminat_parke", label: "Laminat Parke", icon: Ruler },
  { key: "dis_cephe", label: "Dış Cephe Boyama", icon: Building2 },
  { key: "montaj", label: "Montaj", icon: Settings },
  { key: "dekorasyon", label: "Dekorasyon", icon: Palette },
  { key: "ev_temizligi", label: "Ev Temizliği", icon: SprayCan },
  { key: "nakliye", label: "Nakliye Hizmeti", icon: Truck },
  { key: "kaynak", label: "Kaynak İşleri", icon: Wrench },
  { key: "sap_beton", label: "Şap ve Saha Beton Hizmetleri", icon: Layers },
  { key: "mobilya_montaj_tamir", label: "Mobilya Montaj ve Tamir Hizmetleri", icon: Wrench },
  { key: "cati", label: "Çatı İşleri", icon: Hammer },
  { key: "sundurma", label: "Sundurma İşleri", icon: Building2 },
  { key: "hali_yikama", label: "Halı Yıkama Hizmetleri", icon: SprayCan },
  { key: "koltuk_yikama", label: "Koltuk Yıkama", icon: SprayCan },
];

const PROMOTION_IMAGES = [
  "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85",
];
const PROMOTION_IMAGE_BY_ID: Record<string, string> = {
  alcipan: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85",
  sove: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
  elektrik: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=85",
  tesisat: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=1200&q=85",
  klima_ariza_bakim: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85",
  beyaz_esya: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=1200&q=85",
  boya: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=85",
  dekoratif_siva: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85",
  duvar_kagidi: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85",
  isi_yalitimi: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85",
  tadilat: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=85",
  tamirat: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=85",
  seramik: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
  fayans: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85",
  laminat_parke: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85",
  dis_cephe: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=85",
  montaj: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=1200&q=85",
  dekorasyon: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85",
  kaynak: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=85",
  mobilya_montaj_tamir: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85",
  sap_beton: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=85",
  sundurma: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=85",
  hali_yikama: "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=1200&q=85",
  koltuk_yikama: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85",
  nakliye: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=85",
  ev_temizligi: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85",
  cati: "https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=1200&q=85",
};
const PROMOTION_TONES = ["#D8753B", "#177D73", "#B95E2E", "#3D526B", "#6D5A8E"];
const PROMOTION_COPY: Record<string, { badge: string; title: string; subtitle: string }> = {
  alcipan: { badge: "ALÇI & ALÇIPAN", title: "Duvarınızı yenileyin", subtitle: "Bölme duvar, asma tavan ve alçıpan onarımı için usta bulun" },
  sove: { badge: "DIŞ CEPHE", title: "Evinize şık bir görünüm", subtitle: "Söve uygulama ve dış cephe detayları için Antalya ustaları" },
  boya: { badge: "BOYA & BADANA", title: "Evinizin rengi değişsin", subtitle: "Temiz işçilikle boya, badana ve renk yenileme hizmeti" },
  dekoratif_siva: { badge: "DEKORATİF UYGULAMA", title: "Duvarlarda özel dokular", subtitle: "Dekoratif sıva ve modern duvar uygulamaları için usta bulun" },
  duvar_kagidi: { badge: "DUVAR KAĞIDI", title: "Duvarlarınıza yeni bir hava", subtitle: "Ölçü, uygulama ve kusursuz duvar kağıdı işçiliği" },
  isi_yalitimi: { badge: "ISI YALITIMI", title: "Daha sıcak, daha verimli", subtitle: "Eviniz için ısı yalıtımı ve enerji tasarrufu çözümleri" },
  tadilat: { badge: "TADİLAT", title: "Evinizi baştan tasarlayın", subtitle: "Banyo, mutfak ve komple tadilat işleriniz için doğru usta" },
  tamirat: { badge: "TAMİRAT", title: "Küçük arıza, hızlı çözüm", subtitle: "Evinizdeki tamirat işleri için güvenilir usta bir dokunuş uzağınızda" },
  tesisat: { badge: "TESİSAT", title: "Su kaçağı beklemez", subtitle: "Musluk, gider, su kaçağı ve tesisat arızalarında hızlı destek" },
  klima_ariza_bakim: { badge: "KLİMA SERVİSİ", title: "Klimanız yeniden nefes alsın", subtitle: "Arıza, bakım, montaj ve temizlik için klima ustası bulun" },
  beyaz_esya: { badge: "TAMİR & MONTAJ", title: "Beyaz eşyanız için usta", subtitle: "Çamaşır makinesi, buzdolabı ve bulaşık makinesi tamiri" },
  elektrik: { badge: "ELEKTRİK", title: "Elektrik işlerini ertelemeyin", subtitle: "Arıza, priz, aydınlatma ve elektrik tesisatı için uzman usta" },
  seramik: { badge: "SERAMİK", title: "Zemin ve duvarlara yeni görünüm", subtitle: "Seramik döşeme, yenileme ve usta işçilik çözümleri" },
  fayans: { badge: "FAYANS", title: "Kırık fayanslara çözüm", subtitle: "Fayans döşeme, değişim, derz ve silikon yenileme hizmeti" },
  laminat_parke: { badge: "LAMİNAT PARKE", title: "Zemininiz yeniden parlasın", subtitle: "Parke döşeme, sökme, yenileme ve bölgesel tamirat" },
  dis_cephe: { badge: "DIŞ CEPHE", title: "Binanıza yeni bir yüz", subtitle: "Apartman, villa ve işyeri dış cephe boyama hizmeti" },
  montaj: { badge: "MONTAJ", title: "Kurulum işini ustasına bırakın", subtitle: "Mobilya, TV ünitesi, avize ve raf montajı için usta bulun" },
  dekorasyon: { badge: "DEKORASYON", title: "Hayalinizdeki yaşam alanı", subtitle: "Salon, mutfak, yatak odası ve komple ev dekorasyonu" },
  ev_temizligi: { badge: "EV TEMİZLİĞİ", title: "Temizliğe zaman ayırmayın", subtitle: "Standart, derin ve taşınma sonrası temizlik hizmeti" },
  nakliye: { badge: "NAKLİYE", title: "Taşınmak artık daha kolay", subtitle: "Evden eve, ofis, parça eşya ve asansörlü taşıma hizmeti" },
  kaynak: { badge: "KAYNAK İŞLERİ", title: "Metal işlerinde sağlam çözüm", subtitle: "Korkuluk, kapı, demir doğrama ve çelik konstrüksiyon" },
  mobilya_montaj_tamir: { badge: "MOBİLYA", title: "Mobilyanız yeniden hayat bulsun", subtitle: "Dolap, gardırop, mutfak dolabı ve çekmece tamiri" },
  cati: { badge: "ÇATI İŞLERİ", title: "Çatınız güvenle korusun", subtitle: "Akıntı, kiremit, izolasyon ve oluk tamiri için usta bulun" },
  sundurma: { badge: "SUNDURMA", title: "Girişinizi koruyun", subtitle: "Balkon, teras, veranda ve araç sundurması uygulamaları" },
  hali_yikama: { badge: "HALI YIKAMA", title: "Halılarınız tertemiz olsun", subtitle: "Halı, yolluk ve halı takımlarınız için profesyonel temizlik" },
  koltuk_yikama: { badge: "KOLTUK YIKAMA", title: "Koltuklarda derin temizlik", subtitle: "Köşe koltuk, berjer, sandalye ve yatak temizliği" },
};
const PROMOTIONS = CATEGORIES.map((category, index) => ({
  id: category.key,
  badge: PROMOTION_COPY[category.key]?.badge ?? "USTA CEPTE HİZMETİ",
  title: PROMOTION_COPY[category.key]?.title ?? `${category.label} için doğru usta`,
  subtitle: PROMOTION_COPY[category.key]?.subtitle ?? `Antalya’da ${category.label.toLocaleLowerCase("tr-TR")} hizmeti alın`,
  image: PROMOTION_IMAGE_BY_ID[category.key] ?? PROMOTION_IMAGES[index % PROMOTION_IMAGES.length],
  tone: PROMOTION_TONES[index % PROMOTION_TONES.length],
}));

const PRIORITIES = [
  { key: "acil", label: "Acil", sub: "30 dk içinde", icon: AlertTriangle, tone: "danger" },
  { key: "bugun", label: "Bugün", sub: "Gün içinde", icon: Clock, tone: "copper" },
  { key: "planli", label: "Planlı", sub: "Tarih seçin", icon: CalendarClock, tone: "teal" },
];

const TIME_SLOTS = [
  "Bugün · 10:00 – 13:00",
  "Bugün · 13:00 – 16:00",
  "Bugün · 16:00 – 19:00",
  "Yarın · 09:00 – 12:00",
];
const CLEANING_TEAM_SIZES = ["1 kişilik ekip", "2 kişilik ekip", "3 kişilik ekip"];
const HOUSE_TYPES = ["1+1", "2+1", "3+1", "4+1", "Villa / Müstakil"];
const SUNDURMA_METRAGES = Array.from({ length: 15 }, (_, index) => `${(index + 1) * 10} m²`);
const SERVICE_DETAILS: Record<string, string[]> = {
  alcipan: ["Bölme duvar", "Asma tavan", "Niş veya TV ünitesi", "Kartonpiyer ve ışık kanalı", "Alçıpan onarımı"],
  sove: ["Pencere sövesi", "Kapı sövesi", "Bina dış cephe sövesi", "Dekoratif söve uygulaması", "Mevcut söve onarımı"],
  boya: ["İç cephe boya", "Dış cephe boya", "Tavan boya", "Kapı veya pencere boyama", "Renk değişimi", "Alçı üstü boya"],
  dekoratif_siva: ["İç cephe dekoratif sıva", "Dış cephe dekoratif sıva", "Beton görünümlü sıva", "İpek sıva", "Mevcut yüzey onarımı"],
  duvar_kagidi: ["Tek duvar", "Salon veya oturma odası", "Yatak odası", "Koridor", "Tüm ev"],
  isi_yalitimi: ["Dış cephe ısı yalıtımı", "Çatı ısı yalıtımı", "Teras ısı yalıtımı", "Balkon ısı yalıtımı", "Bölgesel yalıtım onarımı"],
  tadilat: ["Banyo tadilatı", "Mutfak tadilatı", "Komple ev tadilatı", "Oda yenileme", "İşyeri tadilatı", "Kırma ve yeniden yapım"],
  tamirat: ["Kapı veya pencere tamiri", "Duvar ve tavan tamiri", "Dolap veya raf tamiri", "Zemin tamiri", "Genel ev onarımı"],
  tesisat: ["Musluk bozuldu", "Boru patladı", "Lavabo tıkanıklığı", "Su kaçağı tespiti", "Klozet arızası", "Gider veya sifon değişimi"],
  klima_ariza_bakim: ["Klima soğutmuyor", "Klima ısıtmıyor", "Klima su akıtıyor", "Klima gaz dolumu", "Klima bakım ve temizlik", "Klima montajı"],
  beyaz_esya: ["Buzdolabı çalışmıyor", "Çamaşır makinesi çalışmıyor", "Kurutma makinesi çalışmıyor", "Bulaşık makinesi çalışmıyor", "Elektrikli süpürge çalışmıyor", "Fırın / ocak çalışmıyor", "Küçük ev aleti arızası", "Bakım ve temizlik"],
  elektrik: ["Anahtar değişimi", "Priz tamiri", "Yeni kablo çekilecek", "Daire altyapısı değişecek", "Sigorta arızası", "Aydınlatma kurulumu", "Elektrik kaçağı kontrolü"],
  seramik: ["Banyo seramik döşeme", "Mutfak seramik döşeme", "Zemin seramiği", "Kırık seramik değişimi", "Derz yenileme"],
  fayans: ["Banyo fayansı", "Mutfak fayansı", "Duvar fayansı", "Kırık fayans değişimi", "Derz ve silikon yenileme"],
  laminat_parke: ["Laminat parke döşeme", "Parke sökme ve yenileme", "Şişen parke onarımı", "Süpürgelik değişimi", "Bölgesel parke tamiri"],
  dis_cephe: ["Apartman dış cephe boyama", "Müstakil ev dış cephe", "İşyeri dış cephe", "Cephe çatlak onarımı", "Dış cephe yenileme"],
  montaj: ["Mobilya montajı", "TV ünitesi montajı", "Avize veya aydınlatma montajı", "Perde ve korniş montajı", "Raf ve askılık montajı"],
  dekorasyon: ["Salon dekorasyonu", "Mutfak dekorasyonu", "Yatak odası dekorasyonu", "İşyeri dekorasyonu", "Komple ev dekorasyonu"],
  ev_temizligi: ["Standart ev temizliği", "Derin temizlik", "Taşınma öncesi temizlik", "Taşınma sonrası temizlik", "İnşaat sonrası temizlik"],
  nakliye: ["Evden eve nakliye", "Ofis taşıma", "Parça eşya taşıma", "Şehir içi taşıma", "Asansörlü taşıma", "Eşya depolama"],
  kaynak: [
    "Giriş kapısı kaynak yapılacak",
    "Korkuluk veya küpeşte kaynak yapılacak",
    "Balkon / teras korkuluğu yapılacak",
    "Demir doğrama tamiri",
    "Çelik konstrüksiyon kaynak işi",
    "Sundurma iskeleti kaynak işi",
    "Ferforje kapı veya pencere tamiri",
    "Boru veya profil kaynak işi",
    "Kırık metal parça tamiri",
  ],
  sap_beton: ["Daire içi şap dökümü", "Bina giriş beton dökümü", "Çatı kat beton dökümü", "Yürüyüş yolu betonu", "Zemin tesviyesi"],
  mobilya_montaj_tamir: ["Dolap montajı", "Mutfak dolabı tamiri", "Gardırop tamiri", "Masa veya sandalye tamiri", "Çekmece ve menteşe değişimi"],
  cati: ["Kiremit çatı onarımı", "Çatı akıntısı", "Çatı izolasyonu", "Çatı kiremit değişimi", "Oluk ve dere tamiri"],
  sundurma: [
    "Giriş kapısı üstü sundurma",
    "Balkon üstü sundurma",
    "Teras sundurması",
    "Bahçe veya veranda sundurması",
    "Otopark / araç sundurması",
    "İşyeri önü sundurması",
    "Depo veya hangar sundurması",
    "Polikarbonat çatı kaplama",
    "Trapez sac çatı kaplama",
    "Çelik konstrüksiyon sundurma",
    "Mevcut sundurma tamiri",
  ],
  hali_yikama: ["Küçük halı", "Yolluk", "Büyük halı", "Halı takımı", "Yerinde halı yıkama"],
  koltuk_yikama: ["Tekli koltuk", "Çiftli koltuk", "3 kişilik koltuk", "Köşe koltuk", "Berjer veya sandalye", "Yatak ve baza"],
};

const MASTERS = [
  { name: "Mehmet Yılmaz", service: "Elektrik", phone: "0532 111 22 33", rating: 4.9, jobs: 86, distance: "1.8 km", status: "Müsait", top: "28%", left: "62%" },
  { name: "Ahmet Demir", service: "Tesisat", phone: "0533 222 33 44", rating: 4.8, jobs: 124, distance: "2.4 km", status: "Müsait", top: "54%", left: "30%" },
  { name: "Hakan Şahin", service: "Tamirat", phone: "0534 333 44 55", rating: 4.7, jobs: 53, distance: "3.1 km", status: "Meşgul", top: "70%", left: "72%" },
  { name: "Serkan Kaya", service: "Boya", phone: "0535 444 55 66", rating: 4.9, jobs: 41, distance: "3.6 km", status: "Müsait", top: "20%", left: "22%" },
  { name: "Barış Öztürk", service: "Tadilat", phone: "0536 555 66 77", rating: 4.6, jobs: 67, distance: "2.1 km", status: "Müsait", top: "40%", left: "48%" },
  { name: "Emre Aksoy", service: "Seramik", phone: "0537 666 77 88", rating: 4.8, jobs: 39, distance: "2.9 km", status: "Müsait", top: "62%", left: "18%" },
];

const seedJobs = [
  { id: 1, requestId: 1, title: "Elektrik Arızası", loc: "Fener Mahallesi · Muratpaşa", customerName: "Selin Aydın", customerPhone: "0542 123 45 67", status: "active", master: "Mehmet Yılmaz", masterPhone: "0532 111 22 33", departureTime: "09:14", eta: "12 dk" },
  { id: 2, requestId: 2, title: "Banyo Seramik Tamiratı", loc: "Çağlayan Mahallesi · Kepez", customerName: "Selin Aydın", customerPhone: "0542 123 45 67", status: "searching" },
];

type ActiveRole = "customer" | "usta";
type StoredAccount = { id?: number; name?: string; email?: string; phone?: string; role?: string; active?: boolean };

function readStoredAccount(): StoredAccount | null {
  try {
    const value = JSON.parse(window.localStorage.getItem("usta-cepte-account") ?? "null");
    if (value && typeof value === "object" && (value as StoredAccount).active) return value as StoredAccount;
    const sharedUserName = window.localStorage.getItem("usta-cepte-user-name");
    if (sharedUserName) {
      return { ...(value && typeof value === "object" ? value as StoredAccount : {}), name: sharedUserName, active: true, role: "customer" };
    }
    const savedProfileName = window.localStorage.getItem("usta-cepte-profile-name");
    if (savedProfileName && savedProfileName !== "Misafir") {
      return { ...(value && typeof value === "object" ? value as StoredAccount : {}), name: savedProfileName, active: true, role: "customer" };
    }
    return value && typeof value === "object" ? value as StoredAccount : null;
  } catch {
    const sharedUserName = window.localStorage.getItem("usta-cepte-user-name");
    const savedProfileName = window.localStorage.getItem("usta-cepte-profile-name");
    const name = sharedUserName || (savedProfileName && savedProfileName !== "Misafir" ? savedProfileName : "");
    return name ? { name, active: true, role: "customer" } : null;
  }
}

function normalizeActiveRole(value: unknown): ActiveRole | null {
  if (value === "customer" || value === "usta") return value;
  return null;
}

function normalizeAccountRole(value: unknown): ActiveRole | null {
  if (isProviderRole(value)) return "usta";
  if (typeof value === "string" && ["customer", "Customer", "Müşteri", "Musteri", "CUSTOMER"].includes(value)) return "customer";
  return null;
}

function isProviderRole(value: unknown): boolean {
  return typeof value === "string" && ["usta", "Usta", "Nakliyeci", "PROVIDER", "provider", "craftsman"].includes(value);
}

function getInitialActiveRole(account: StoredAccount | null = readStoredAccount()): ActiveRole | null {
  const stored = normalizeActiveRole(window.localStorage.getItem("usta-cepte-active-role"));
  if (stored) return stored;
  if (!account?.active) return null;
  return normalizeAccountRole(account?.role) === "usta" ? "usta" : "customer";
}

// ─── CSS vars (light warm theme) ─────────────────────────────────────────────

const vars: Record<string, string> = {
  "--bg": "#F7F1E7",
  "--surface": "#FCFBF8",
  "--surface2": "#EEE6D8",
  "--navy": "#172A3E",
  "--copper": "#D86134",
  "--teal": "#176B6A",
  "--danger": "#C4453A",
  "--text": "#1B2430",
  "--muted": "#647082",
  "--border": "rgba(27,36,48,0.13)",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TopBar({ title, onBack }: { title?: string; onBack?: () => void }) {
  const [location, setLocation] = useState({ lat: 36.8874, lng: 30.7061 });
  const [locationLabel, setLocationLabel] = useState("Konumunuzu buluyoruz…");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const reverseGeocode = useCallback(async (next: { lat: number; lng: number }) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${next.lat}&lon=${next.lng}&zoom=18&addressdetails=1`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("reverse geocode failed");
      const result = await response.json();
      const address = result.address ?? {};
      const street = address.road ?? address.pedestrian ?? address.footway;
      const number = address.house_number;
      const locality = address.neighbourhood ?? address.suburb ?? address.city_district ?? address.town ?? address.city;
      const parts = [
        street ? `${street}${number ? `, ${number}` : ""}` : "",
        locality,
        address.city ?? address.town,
      ].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index);
      setLocationLabel(parts.length ? parts.slice(0, 2).join(" · ") : "Adres bulunamadı");
    } catch {
      setLocationLabel("Adres bulunamadı · Tekrar denemek için dokunun");
    }
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationLabel("Bu tarayıcı konum desteği vermiyor");
      return;
    }
    setLocating(true);
    setLocationLabel("Konumunuzu buluyoruz…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setLocation(next);
        setLocating(false);
        void reverseGeocode(next);
      },
      (error) => {
        setLocating(false);
        setLocationLabel(error.code === 1 ? "Konum izni gerekli · Tekrar deneyin" : "Konum alınamadı · Tekrar deneyin");
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
  }, [reverseGeocode]);

  useEffect(() => {
    locate();
  }, [locate]);

  const mapDelta = 0.006;
  const locationMapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - mapDelta}%2C${location.lat - mapDelta}%2C${location.lng + mapDelta}%2C${location.lat + mapDelta}&layer=mapnik&marker=${location.lat}%2C${location.lng}`;
  const account = readStoredAccount();
  const accountInitials = account?.active
    ? (account.name ?? "M").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "M"
    : "";

  return (
    <div className={`topbar${!onBack ? " topbar-home" : ""}`} style={s.topbar}>
      {onBack ? (
        <button type="button" data-testid="button-back" onClick={onBack} style={s.iconBtn} aria-label="Geri">
          <ArrowLeft size={19} color="var(--text)" />
        </button>
      ) : (
        <div className="brand-lockup" aria-label="Usta Cepte ana sayfa">
          <span className="brand-mark" aria-hidden="true"><Hammer size={19} color="#FFF" strokeWidth={2.5} /></span>
          <span className="brand-wordmark"><strong>usta</strong><em>cepte</em></span>
        </div>
      )}
      <div className="header-title" style={s.topTitle}>{title ?? (!onBack ? "Usta Cepte" : "")}</div>
      <button type="button" className={`header-avatar${account?.active ? "" : " is-guest"}`} onClick={() => window.dispatchEvent(new CustomEvent("usta-cepte-open-account"))} aria-label="Hesabımı aç">
        {account?.active ? accountInitials : <User size={17} color="var(--muted)" />}
      </button>
      {!onBack && locationOpen && (
        <div style={s.locationPopover}>
          <div style={s.locationPopoverHead} aria-busy={locating}><LocateFixed size={14} color={locating ? "var(--copper)" : "var(--teal)"} /> Müşterinin canlı konumu</div>
          <div style={s.locationMapFrame}>
            <iframe title="Müşterinin canlı konumu haritası" src={locationMapSrc} style={s.locationMapIframe} />
          </div>
          <div style={s.locationPopoverAddress}>{locationLabel}</div>
          <div style={s.locationPopoverCoords}>Mahalle · Cadde/Sokak · Semt bilgisi</div>
        </div>
      )}
    </div>
  );
}

function CategoryTile({ cat, selected, onClick }: { cat: typeof CATEGORIES[0]; selected: boolean; onClick: () => void }) {
  const Icon = cat.icon;
  const image = PROMOTION_IMAGE_BY_ID[cat.key] ?? PROMOTION_IMAGES[CATEGORIES.findIndex((item) => item.key === cat.key) % PROMOTION_IMAGES.length];
  return (
    <button type="button" data-testid={`button-category-${cat.key}`} onClick={onClick} aria-pressed={selected} aria-label={`${cat.label}${selected ? " seçildi" : ""}`} style={{ ...s.catTile, ...(selected ? s.catTileActive : {}), padding: 0, overflow: "hidden", alignItems: "stretch" }}>
      {selected && <span style={s.catCheck}><Check size={10} color="#FFF" strokeWidth={3} /></span>}
      <div style={{ ...s.catPhoto, backgroundImage: `linear-gradient(180deg, rgba(23,42,62,.04), rgba(23,42,62,.68)), url("${image}")` }}>
        <div style={{ ...s.catIconWrap, ...(selected ? s.catIconWrapActive : {}) }}>
          <Icon size={18} color={selected ? "#FFF" : "#FFF"} strokeWidth={2.1} />
        </div>
      </div>
      <span style={{ ...s.catLabel, color: selected ? "var(--teal)" : "var(--text)", fontWeight: selected ? 800 : 700, padding: "9px 8px 11px", minHeight: 43 }}>{cat.label}</span>
    </button>
  );
}

function PromotionCarousel({ onStart }: { onStart: (cat: string | null) => void }) {
  const [active, setActive] = useState(0);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);
  const promo = PROMOTIONS[active];
  const nextPromo = PROMOTIONS[(active + 1) % PROMOTIONS.length];
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientX;
    dragged.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current == null) return;
    const delta = event.clientX - dragStart.current;
    if (Math.abs(delta) > 35) {
      dragged.current = true;
      setActive((current) => (delta < 0 ? (current + 1) % PROMOTIONS.length : (current - 1 + PROMOTIONS.length) % PROMOTIONS.length));
    }
    dragStart.current = null;
  };
  return (
    <section className="promo-carousel" aria-label="Öne çıkan hizmetler">
      <div className="promo-heading">
        <div>
          <div className="promo-eyebrow">USTA CEPTE’DE ÖNE ÇIKANLAR</div>
          <h2>İşiniz için doğru usta burada</h2>
        </div>
        <div className="promo-controls">
          <span>{active + 1} / {PROMOTIONS.length}</span>
          <button type="button" aria-label="Önceki hizmeti göster" onClick={() => setActive((current) => (current - 1 + PROMOTIONS.length) % PROMOTIONS.length)}><ArrowLeft size={13} /></button>
          <button type="button" aria-label="Sonraki hizmeti göster" onClick={() => setActive((current) => (current + 1) % PROMOTIONS.length)}><ChevronRight size={13} /></button>
        </div>
      </div>
      <div className="promo-viewport" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={() => { dragStart.current = null; }} style={{ touchAction: "pan-y" }}>
        <div className="promo-track">
          {[promo, nextPromo].map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              className={`promo-slide${index === 1 ? " is-peek" : ""}`}
              data-testid={`button-promotion-${item.id}`}
              type="button"
              aria-label={`${item.title} hizmet talebi oluştur`}
              onClick={(event) => {
                if (dragged.current) {
                  event.preventDefault();
                  dragged.current = false;
                  return;
                }
                if (index === 1) {
                  setActive((current) => (current + 1) % PROMOTIONS.length);
                } else {
                  onStart(item.id);
                }
              }}
              style={{ backgroundImage: `linear-gradient(90deg, ${item.tone}E8 0%, ${item.tone}B8 44%, rgba(27,42,60,.08) 100%), url("${item.image}")` }}
            >
              <span className="promo-copy">
                <span className="promo-badge">{item.badge}</span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
                <span className="promo-action">Usta bul <ChevronRight size={14} /></span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="promo-dots" role="tablist" aria-label="Reklam slaytları">
        {PROMOTIONS.map((item, index) => (
          <button key={item.id} type="button" className={index === active ? "is-active" : ""} onClick={() => setActive(index)} aria-label={`${index + 1}. reklam`} />
        ))}
      </div>
    </section>
  );
}

function LiveLocationCard({ address, compact, onLocationChange, onAddressChange }: { address: string; compact?: boolean; onLocationChange?: (coords: { lat: number; lng: number }) => void; onAddressChange?: (address: string) => void }) {
  const [coords, setCoords] = useState({ lat: 36.8874, lng: 30.7061 });
  const [locationState, setLocationState] = useState<"live" | "unavailable">("live");
  const reverseGeocode = useCallback(async (next: { lat: number; lng: number }) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${next.lat}&lon=${next.lng}&zoom=18&addressdetails=1`, { headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const result = await response.json();
      const addressData = result.address ?? {};
      const street = addressData.road ?? addressData.pedestrian ?? addressData.footway;
      const locality = addressData.neighbourhood ?? addressData.suburb ?? addressData.city_district ?? addressData.town ?? addressData.city;
      const parts = [street, locality, addressData.city ?? addressData.town].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index);
      if (parts.length) onAddressChange?.(parts.slice(0, 2).join(" · "));
    } catch {
      // GPS remains usable even when address lookup is temporarily unavailable.
    }
  }, [onAddressChange]);
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      ({ coords: position }) => {
        const next = { lat: position.latitude, lng: position.longitude };
        setCoords(next);
        onLocationChange?.(next);
        void reverseGeocode(next);
        setLocationState("live");
      },
      () => setLocationState("unavailable"),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 12_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [onLocationChange, reverseGeocode]);
  return (
    <div style={{ ...s.liveLocCard, padding: compact ? "10px 12px" : "13px 14px" }}>
      <div style={s.liveLocPulse}>
        <span style={s.liveLocPulseRing} />
        <span style={s.liveLocPulseCore} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.liveLocTitle}><LocateFixed size={12} color="var(--teal)" /> {locationState === "live" ? "Canlı konum paylaşılıyor" : "Konum izni bekleniyor"}</div>
        <div style={s.liveLocAddr}>{address}</div>
        <div style={s.liveLocCoords}>{coords.lat.toFixed(5)}° K, {coords.lng.toFixed(5)}° D</div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, last }: { label: string; value?: string; last?: boolean }) {
  return (
    <div style={{ ...s.reviewRow, borderBottom: last ? "none" : "1px dashed var(--border)" }}>
      <span style={s.reviewLabel}>{label}</span>
      <span style={s.reviewValue}>{value}</span>
    </div>
  );
}

function DepartRow({ label, value, last }: { label: string; value?: string; last?: boolean }) {
  return (
    <div style={{ ...s.reviewRow, borderBottom: last ? "none" : "1px dashed var(--border)" }}>
      <span style={s.reviewLabel}>{label}</span>
      <span style={s.reviewValue}>{value}</span>
    </div>
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function HomeScreen({ onStart, jobs, onOpenJob, onOpenRegistration, onOpenAccount, onOpenNearby, isAuthenticated }: { onStart: (cat: string | null) => void; jobs: typeof seedJobs; onOpenJob: (j: typeof seedJobs[0]) => void; onOpenRegistration: (panel: string) => void; onOpenAccount: () => void; onOpenNearby: () => void; isAuthenticated: boolean }) {
  const [selectedFeaturedMaster, setSelectedFeaturedMaster] = useState<typeof MASTERS[number] | null>(null);
  const [portfolioPhotos, setPortfolioPhotos] = useState<ProfileMedia[]>(() => readProfileMedia("usta-cepte-portfolio-photos"));
  const serviceKey = (service: string) => service === "Elektrik" ? "elektrik" : service === "Tesisat" ? "tesisat" : "boya";
  const active = jobs.find((j) => j.status === "active" || j.status === "searching");
  useEffect(() => {
    const refreshPortfolio = () => setPortfolioPhotos(readProfileMedia("usta-cepte-portfolio-photos"));
    window.addEventListener("usta-cepte-profile-media-changed", refreshPortfolio);
    return () => window.removeEventListener("usta-cepte-profile-media-changed", refreshPortfolio);
  }, []);
  return (
    <div className="main-container" style={s.screen}>
      <TopBar />
      <div className="home-hero" style={s.hero}>
        <div style={s.heroGrid} />
        <div className="hero-eyebrow" style={s.heroEyebrow}>ANTALYA’DA 7/24 HİZMETİNİZDE</div>
        <h1 className="hero-title" style={s.heroTitle}>Boya, alçı, seramik…<br /><span>Usta Cepte.</span></h1>
        <p className="hero-description" style={s.heroSub}>Nakliye, halı yıkama, tesisat ve daha fazlası için güvenilir usta bir dokunuş uzağınızda.</p>
        <button type="button" className="primary-btn" data-testid="button-create-request-hero" style={s.heroCta} onClick={() => onStart(null)} aria-label="Yeni hizmet talebi oluştur">
          Hemen talep oluştur <ArrowRight size={18} strokeWidth={2.2} />
        </button>
         <button type="button" className="nearby-master-link" data-testid="button-see-nearby" onClick={onOpenNearby} aria-label="Yakınımdaki ustaları keşfet">
          <MapPin size={17} strokeWidth={2} /> Yakınımdaki ustaları keşfet <ArrowRight size={15} />
        </button>
        <div className="home-hero-visual" aria-label="Antalya’da yakındaki ustaları gösteren dekoratif harita illüstrasyonu">
          <div className="hero-visual-orbit hero-visual-orbit-one" />
          <div className="hero-visual-orbit hero-visual-orbit-two" />
          <div className="hero-visual-label"><MapPin size={14} /> Usta Cepte / Antalya</div>
          <div className="hero-visual-card hero-visual-card-top"><span>Yakınında</span><strong>Doğru usta</strong></div>
          <div className="hero-visual-card hero-visual-card-bottom"><ShieldCheck size={15} /><span>Doğrulanmış<br />profiller</span></div>
           <div className="hero-visual-center" aria-hidden="true">
             <div className="hero-visual-center-glow" />
             <div className="hero-visual-center-pin"><Wrench size={22} strokeWidth={2.3} /></div>
             <div className="hero-visual-center-copy"><strong>Doğru usta</strong><span>tek dokunuşla</span></div>
           </div>
           <div className="hero-visual-badge"><strong>7/24</strong><span>hızlı destek</span></div>
          <div className="hero-visual-pin hero-visual-pin-one"><Wrench size={17} /></div>
          <div className="hero-visual-pin hero-visual-pin-two"><Hammer size={16} /></div>
          <div className="hero-visual-route" />
        </div>
        <button type="button" className="account-entry-card" data-testid="button-open-account" style={s.accountEntryCard} onClick={onOpenAccount} aria-label="Hesap işlemlerini aç">
          <span className="account-entry-icon" style={s.accountEntryIcon}><Settings size={18} color="var(--teal)" /></span>
          <span className="account-entry-copy" style={{ flex: 1, textAlign: "left" }}><span className="account-entry-kicker">HESABINIZ</span><strong style={s.accountEntryTitle}>Hesap ve üyelik işlemleri</strong><small style={s.accountEntryText}>Profilinizi, üyeliğinizi ve hesap ayarlarınızı yönetin.</small></span>
          <span className="account-entry-arrow"><ChevronRight size={18} /></span>
        </button>
      </div>
      <PromotionCarousel onStart={onStart} />
      <div style={s.customerNoticeSection}>
        <div style={s.sectionLabel}>Sizin için seçtik</div>
        <button type="button" data-testid="button-discover-offers" style={s.customerNotice} onClick={() => onStart(null)} aria-label="Usta Cepte fırsatlarını keşfet">
          <div style={{ ...s.customerNoticeIcon, background: "#FFF0DE", color: "var(--copper)" }}>％</div>
          <div style={{ flex: 1 }}><strong style={s.customerNoticeTitle}>Usta Cepte fırsatları</strong><span style={s.customerNoticeText}>Seçili hizmetlerde indirimleri ve avantajlı teklifleri keşfedin.</span></div>
          <ChevronRight size={16} color="var(--muted)" />
        </button>
        <button type="button" data-testid="button-featured-masters" style={s.customerNotice} onClick={() => setSelectedFeaturedMaster(MASTERS[0])} aria-label="Yüksek puanlı ustaları görüntüle">
          <div style={{ ...s.customerNoticeIcon, background: "#FFF6D8", color: "#C58A00" }}><Star size={16} fill="currentColor" /></div>
          <div style={{ flex: 1 }}><strong style={s.customerNoticeTitle}>Yüksek puanlı ustalar</strong><span style={s.customerNoticeText}>Gerçek müşterilerden yüksek yıldız alan ustaları görün.</span></div>
          <ChevronRight size={16} color="var(--muted)" />
        </button>
      </div>
      <div style={s.featuredSection}>
        <div style={s.sectionHeader}><div><div style={s.sectionLabel}>Güvenle seçin</div><div style={s.featuredHeading}>Yüksek puanlı ustalar</div></div><Star size={19} color="#F5A623" fill="#F5A623" /></div>
        <div style={s.featuredGrid}>
          {MASTERS.slice(0, 3).map((master) => (
            <button key={master.name} type="button" data-testid={`button-featured-master-${master.name.replace(/\s+/g, "-").toLowerCase()}`} style={s.featuredCard} onClick={() => setSelectedFeaturedMaster(master)} aria-label={`${master.name} profilini görüntüle`}>
              <div style={s.featuredAvatar}><User size={18} color="var(--teal)" /></div>
              <strong style={s.featuredName}>{master.name}</strong>
              <span style={s.featuredSpecialty}>{master.service}</span>
              <span style={s.featuredRating}><Star size={12} color="#F5A623" fill="#F5A623" /> {master.rating.toFixed(1)} · {master.jobs} iş</span>
              <span style={s.featuredStatus}>{master.status}</span>
            </button>
          ))}
        </div>
      </div>
      {selectedFeaturedMaster && (
        <div style={s.profileOverlay} role="dialog" aria-modal="true" aria-label={`${selectedFeaturedMaster.name} usta profili`}>
          <div style={s.profileModal}>
            <button type="button" data-testid="button-close-master-profile" style={s.profileClose} aria-label="Profili kapat" onClick={() => setSelectedFeaturedMaster(null)}><X size={18} color="var(--muted)" /></button>
            <div style={s.profileAvatarLarge}><User size={28} color="var(--teal)" /></div>
            <div style={s.profileVerified}><ShieldCheck size={13} /> KİMLİĞİ DOĞRULANMIŞ USTA</div>
            <h2 style={s.profileName}>{selectedFeaturedMaster.name}</h2>
            <div style={s.profileService}>{selectedFeaturedMaster.service}</div>
            <div style={s.profileRatingLarge}><Star size={17} color="#F5A623" fill="#F5A623" /><strong>{selectedFeaturedMaster.rating.toFixed(1)}</strong><span style={s.profileRatingLargeSpan}>· {selectedFeaturedMaster.jobs} tamamlanan iş</span></div>
            <div style={s.profileStatus}>{selectedFeaturedMaster.status}</div>
             <div className="provider-public-gallery">
               <div className="provider-public-gallery-heading"><strong>Yaptığı işler</strong><span>Müşteriler için portföy</span></div>
               {portfolioPhotos.length ? (
                 <div className="provider-public-gallery-grid">
                   {portfolioPhotos.map((item) => <img key={item.id} src={item.dataUrl} alt={`${selectedFeaturedMaster.name} tarafından yapılan iş`} />)}
                 </div>
               ) : <div className="provider-public-gallery-empty"><ImageIcon size={15} /> Bu hizmet veren henüz iş fotoğrafı eklemedi.</div>}
             </div>
            <button type="button" data-testid="button-request-featured-master" className="primary-btn" style={s.profileCta} onClick={() => { setSelectedFeaturedMaster(null); onStart(serviceKey(selectedFeaturedMaster.service)); }} aria-label={`${selectedFeaturedMaster.name} ustadan hizmet al`}>
              Bu ustadan hizmet al <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {active && (
        <div style={s.sectionPad}>
          <div style={s.sectionLabel}>Devam eden talebin</div>
          <button type="button" data-testid={`button-open-active-request-${active.id}`} className="active-request-card" style={s.activeCard} onClick={() => onOpenJob(active as typeof seedJobs[0])} aria-label={`${active.title} talebini görüntüle`}>
            <div style={s.pulseWrap}>
              <span style={s.pulseRing} /><span style={s.pulseCore} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={s.activeTitle}>{active.title}</div>
              <div style={{ ...s.activeSub, color: active.status === "active" ? "var(--teal)" : "var(--copper)" }}>
                {active.status === "active" ? `${active.master} · ${active.departureTime}'de yola çıktı · ${active.eta}` : "Size en uygun usta aranıyor…"}
              </div>
            </div>
            <div style={s.activeArrow}><ChevronRight size={17} color="var(--navy)" /></div>
          </button>
        </div>
      )}

      <div style={s.sectionPad}>
        <div style={s.sectionLabel}>Hangi konuda destek lazım?</div>
        <div style={s.catGrid}>
          {CATEGORIES.map((c) => (
            <CategoryTile key={c.key} cat={c} selected={false} onClick={() => onStart(c.key)} />
          ))}
        </div>
      </div>

      <div style={{ height: 90 }} />
    </div>
  );
}

function RequestFlow({ initialCat, onClose, onSubmit }: { initialCat: string | null; onClose: () => void; onSubmit: (data: any) => void }) {
  const [step, setStep] = useState(0);
  const [selectedCats, setSelectedCats] = useState<string[]>(initialCat ? [initialCat] : []);
  const [fullName, setFullName] = useState(() => {
    const account = readStoredAccount();
    return account?.name && account.name !== "Misafir" ? account.name : "";
  });
  const [phone, setPhone] = useState(() => readStoredAccount()?.phone ?? "");
  const [site, setSite] = useState("Lara Konakları");
  const [blok, setBlok] = useState("B Blok");
  const [daire, setDaire] = useState("18");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("acil");
  const [slot, setSlot] = useState(TIME_SLOTS[2]);
  const [photoAdded, setPhotoAdded] = useState(false);
  const [mediaNames, setMediaNames] = useState<string[]>([]);
  const [cleaningTeamSize, setCleaningTeamSize] = useState(CLEANING_TEAM_SIZES[0]);
  const [houseType, setHouseType] = useState("");
  const [selectedDetails, setSelectedDetails] = useState<Record<string, string[]>>({});
  const [sundurmaMetraj, setSundurmaMetraj] = useState("");
  const [sent, setSent] = useState(false);
  const [customerLocation, setCustomerLocation] = useState({ lat: 36.8874, lng: 30.7061 });
  const [detectedAddress, setDetectedAddress] = useState("");

  const cat = selectedCats[0] ?? null;
  const catObj = CATEGORIES.find((c) => c.key === cat);
  const selectedServiceDetails = selectedCats.flatMap((key) => (selectedDetails[key] ?? []).map((detail) => {
    const category = CATEGORIES.find((item) => item.key === key);
    return `${category?.label ?? key}: ${detail}`;
  }));
  const selectedDetail = selectedServiceDetails.join(" · ") || houseType;
  const typedAddress = `${site}, ${blok} · Daire ${daire}`;
  const address = detectedAddress ? `${detectedAddress} · ${typedAddress}` : typedAddress;
  const activeAccount = Boolean(readStoredAccount()?.active);
  const canStep0 = selectedCats.length > 0
    && selectedCats.every((key) => !SERVICE_DETAILS[key] || (selectedDetails[key]?.length ?? 0) > 0)
    && (selectedCats.includes("sundurma") ? !!sundurmaMetraj : true);
  const canStep1 = activeAccount || (fullName.trim().length > 1 && phone.replace(/\D/g, "").length >= 10);
  const canStep2 = title.trim().length > 2;
  const steps = ["Hizmet", "Bilgiler", "Detaylar", "Onay"];

  if (sent) {
    return (
      <MatchingScreen
        catObj={catObj}
        customer={{ fullName, phone, address }}
        onClose={onClose}
        onDone={(matched: any, departureTime: string) =>
            onSubmit({ title, cat, catObj, selectedCats, selectedDetails, priority, slot, site, blok, daire, address, fullName, phone, customerLocation, matched, departureTime, cleaningTeamSize, houseType, serviceDetail: selectedServiceDetails.join(" · "), sundurmaMetraj, mediaNames })
        }
      />
    );
  }

  return (
    <div className="request-flow-screen" style={s.screen}>
      <TopBar title="Talep Oluştur" onBack={onClose} />
      <div style={s.progressWrap}>
        {steps.map((label, i) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ ...s.progressBar, background: i <= step ? "var(--copper)" : "var(--border)" }} />
            <div style={{ ...s.progressLabel, color: i === step ? "var(--copper)" : "var(--muted)" }}>
              {String(i + 1).padStart(2, "0")} · {label}
            </div>
          </div>
        ))}
      </div>

      <div style={s.flowBody}>
        {step === 0 && (
          <>
            <div style={s.qTitle}>Hangi konuda destek lazım?</div>
            <div style={s.catGrid}>
              {CATEGORIES.map((c) => <CategoryTile key={c.key} cat={c} selected={selectedCats.includes(c.key)} onClick={() => {
                setSelectedCats((current) => current.includes(c.key) ? current.filter((key) => key !== c.key) : [...current, c.key]);
                setSelectedDetails((current) => {
                  if (selectedCats.includes(c.key)) {
                    const next = { ...current };
                    delete next[c.key];
                    return next;
                  }
                  return current;
                });
                setHouseType("");
                setSundurmaMetraj("");
                setCleaningTeamSize("");
              }} />)}
            </div>
            {selectedCats.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="request-multi-hint"><Check size={14} /> Birden fazla hizmet ve iş detayı seçebilirsiniz</div>
                {selectedCats.map((selectedKey) => {
                  const selectedCategory = CATEGORIES.find((item) => item.key === selectedKey);
                  const details = SERVICE_DETAILS[selectedKey];
                  if (!details) return null;
                  return (
                    <div key={selectedKey} style={{ marginTop: 12 }}>
                      <div style={s.fieldLabel}>{selectedCategory?.label.toUpperCase()}</div>
                      <div style={s.choiceRow}>
                        {details.map((option) => {
                          const isSelected = (selectedDetails[selectedKey] ?? []).includes(option);
                          return <button key={option} type="button" onClick={() => setSelectedDetails((current) => {
                            const existing = current[selectedKey] ?? [];
                            const nextValues = existing.includes(option) ? existing.filter((value) => value !== option) : [...existing, option];
                            return { ...current, [selectedKey]: nextValues };
                          })} style={{ ...s.choiceBtn, ...(isSelected ? s.choiceBtnActive : {}) }} aria-pressed={isSelected}>{isSelected && <Check size={12} />} {option}</button>;
                        })}
                      </div>
                    </div>
                  );
                })}
                {selectedCats.includes("ev_temizligi") && (
                  <>
                    <div style={{ ...s.fieldLabel, marginTop: 14 }}>EKİP TERCİHİ</div>
                    <div style={s.choiceRow}>
                      {CLEANING_TEAM_SIZES.map((size) => <button key={size} type="button" onClick={() => setCleaningTeamSize((current) => current === size ? "" : size)} style={{ ...s.choiceBtn, ...(cleaningTeamSize === size ? s.choiceBtnActive : {}) }}>{size}</button>)}
                    </div>
                  </>
                )}
                {selectedCats.includes("sundurma") && (
                  <>
                    <div style={{ ...s.fieldLabel, marginTop: 14 }}>TAHMİNİ METRAJ</div>
                    <div style={s.choiceRow}>
                      {SUNDURMA_METRAGES.map((metraj) => (
                        <button key={metraj} type="button" onClick={() => setSundurmaMetraj((current) => current === metraj ? "" : metraj)} style={{ ...s.choiceBtn, ...(sundurmaMetraj === metraj ? s.choiceBtnActive : {}) }}>
                          {metraj}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div style={s.qTitle}>Ustanın seni bulabilmesi için</div>
            {activeAccount && <div className="request-account-prefill"><ShieldCheck size={15} /><span>Hesap bilgileriniz otomatik dolduruldu. Gerekirse düzenleyebilirsiniz.</span></div>}
            <div style={s.field}>
              <label style={s.fieldSub}>Müşteri adı soyadı</label>
              <div style={s.inputWithIcon}>
                <User size={16} color="var(--muted)" />
                <input style={s.inputBare} placeholder="Adınız Soyadınız" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.fieldSub}>Telefon Numarası</label>
              <div style={s.inputWithIcon}>
                <Phone size={16} color="var(--muted)" />
                <input style={s.inputBare} placeholder="05xx xxx xx xx" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div style={s.fieldLabel}>CANLI KONUM</div>
            <div style={{ marginBottom: 16 }}><LiveLocationCard address={detectedAddress || "Konumunuz algılanıyor…"} onLocationChange={setCustomerLocation} onAddressChange={setDetectedAddress} /></div>
            <div style={s.fieldLabel}>ADRES</div>
            {detectedAddress && <div className="request-detected-address"><LocateFixed size={14} /><span><strong>Konumdan alınan adres</strong>{detectedAddress}</span></div>}
            <div style={s.field}>
              <label style={s.fieldSub}>Site</label>
              <input style={s.input} value={site} onChange={(e) => setSite(e.target.value)} placeholder="Site adı" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ ...s.field, flex: 1 }}>
                <label style={s.fieldSub}>Blok</label>
                <input style={s.input} value={blok} onChange={(e) => setBlok(e.target.value)} />
              </div>
              <div style={{ ...s.field, flex: 1 }}>
                <label style={s.fieldSub}>Daire</label>
                <input style={s.input} value={daire} onChange={(e) => setDaire(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={s.qTitle}>Ustanın hazırlıklı gelmesini sağlayın</div>
            <div style={s.field}>
              <label style={s.fieldSub}>Talep başlığı</label>
              <input style={s.input} placeholder="Örn. Salon prizlerinde elektrik yok" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.fieldSub}>Açıklama <span style={{ color: "var(--muted)", fontWeight: 400 }}>(isteğe bağlı)</span></label>
              <textarea style={s.textarea} rows={3} placeholder="Sorunu kısaca anlatın…" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div style={s.fieldLabel}>ÖNCELİK</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {PRIORITIES.map((p) => {
                const Icon = p.icon;
                const isActive = priority === p.key;
                const activeBg = p.tone === "danger" ? "#FBEAE8" : p.tone === "copper" ? "#FBEEDF" : "#E7F3F0";
                const activeBorder = `var(--${p.tone === "danger" ? "danger" : p.tone})`;
                return (
                  <button type="button" key={p.key} aria-pressed={isActive} onClick={() => {
                    const nextPriority = priority === p.key ? "" : p.key;
                    setPriority(nextPriority);
                    if (nextPriority === "acil") setSlot("");
                  }}
                    style={{ ...s.priorityBtn, ...(isActive ? { background: activeBg, borderColor: activeBorder, borderWidth: 1.5 } : {}) }}>
                    <Icon size={17} color={isActive ? `var(--${p.tone === "danger" ? "danger" : p.tone})` : "var(--muted)"} strokeWidth={2.2} />
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{p.label}</div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1 }}>{p.sub}</div>
                  </button>
                );
              })}
            </div>
            {priority !== "acil" && (
              <>
                <div style={s.fieldLabel}>TERCİH EDİLEN ZİYARET ZAMANI</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {TIME_SLOTS.map((t) => (
                    <button type="button" key={t} aria-pressed={slot === t} onClick={() => setSlot((current) => current === t ? "" : t)} style={{ ...s.slotBtn, ...(slot === t ? s.slotBtnActive : {}) }}>
                      <Clock size={16} color={slot === t ? "var(--teal)" : "var(--muted)"} />
                      <span style={{ flex: 1 }}>{t}</span>
                      {slot === t && <Check size={16} color="var(--teal)" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div style={s.fieldLabel}>SORUNU GÖSTERİN <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(isteğe bağlı)</span></div>
            <label style={{ ...s.photoBtn, ...(photoAdded ? s.photoBtnActive : {}) }}>
              {photoAdded ? <Check size={17} color="var(--teal)" strokeWidth={3} /> : <Camera size={17} color="var(--muted)" />}
              <span style={{ color: photoAdded ? "var(--teal)" : "var(--muted)", fontWeight: photoAdded ? 700 : 500 }}>
                {photoAdded ? `${mediaNames.length} medya eklendi` : "Fotoğraf / video ekle"}
              </span>
              <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple hidden onChange={(event) => {
                const files = Array.from(event.target.files ?? []).slice(0, 10);
                setMediaNames(files.map((file) => file.name));
                setPhotoAdded(files.length > 0);
              }} />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <div style={s.qTitle}>Talebini gözden geçir</div>
            <div style={s.reviewCard}>
              <div style={s.reviewCardHead}>
                <span>İŞ EMRİ ÖZETİ</span>
                <span>#{Math.floor(Math.random() * 9000 + 1000)}</span>
              </div>
              <ReviewRow label="Ad Soyad" value={fullName || "—"} />
              <ReviewRow label="Telefon" value={phone || "—"} />
              <ReviewRow label="Hizmet" value={catObj?.label || "—"} />
               <ReviewRow label="İş detayı" value={`${selectedDetail || "—"}${cat === "ev_temizligi" ? ` · ${cleaningTeamSize}` : ""}${cat === "sundurma" ? ` · ${sundurmaMetraj || "Metraj belirtilmedi"}` : ""}`} />
              <ReviewRow label="Konum" value={address} />
              <ReviewRow label="Başlık" value={title || "—"} />
              <ReviewRow label="Öncelik" value={PRIORITIES.find((p) => p.key === priority)?.label} />
              <ReviewRow label="Zaman" value={slot} last />
            </div>
            <div style={s.trustRow}>
              <ShieldCheck size={16} color="var(--teal)" />
              Kimliği doğrulanmış ustalar arasından eşleştirme yapılır.
            </div>
          </>
        )}
      </div>

      <div className="request-flow-footer" style={s.flowFooter}>
        <button
           style={{ ...s.submitBtn, opacity: (step === 0 && !canStep0) || (step === 1 && !canStep1) || (step === 2 && !canStep2) ? 0.4 : 1 }}
           disabled={(step === 0 && !canStep0) || (step === 1 && !canStep1) || (step === 2 && !canStep2)}
          onClick={() => (step < 3 ? setStep(step + 1) : setSent(true))}
        >
          {step < 3 ? (<>Devam et <ChevronRight size={17} /></>) : (<>Ustaları Ara <PhoneCall size={16} /></>)}
        </button>
      </div>
    </div>
  );
}

function MatchingScreen({ catObj, customer, onClose, onDone }: any) {
  const pool = useMemo(() => {
    let list = MASTERS.filter((m) => catObj && m.service.toLowerCase() === catObj.label.toLowerCase());
    if (list.length === 0) list = MASTERS.slice(0, 4);
    return [...list].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }, [catObj]);

  const [phase, setPhase] = useState("calling");
  const [visibleCount, setVisibleCount] = useState(0);
  const [matched, setMatched] = useState<typeof MASTERS[0] | null>(null);
  const [departureTime, setDepartureTime] = useState("");
  const [followPending, setFollowPending] = useState(false);
  const [followError, setFollowError] = useState("");

  useEffect(() => {
    let i = 0;
    const reveal = setInterval(() => { i += 1; setVisibleCount(i); if (i >= pool.length) clearInterval(reveal); }, 420);
    return () => clearInterval(reveal);
  }, [pool]);

  useEffect(() => {
    const t = setTimeout(() => {
      const chosen = pool[0] || MASTERS[0];
      setDepartureTime(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
      setMatched(chosen);
      setPhase("matched");
    }, 3400);
    return () => clearTimeout(t);
  }, [pool]);

  const eta = matched ? `${Math.max(4, Math.round(parseFloat(matched.distance) * 6))} dk` : "";

  return (
    <div style={{ ...s.screen, display: "flex", flexDirection: "column" }}>
      <TopBar title="" onBack={onClose} />
      <div style={{ padding: "0 20px 12px" }}><LiveLocationCard address={customer.address} compact /></div>

      {phase === "calling" ? (
        <div style={s.callingWrap}>
          <div style={s.radarWrap}>
            <span style={s.radarRing1} /><span style={s.radarRing2} />
            <div style={s.radarCore}><PhoneCall size={20} color="#FFF" /></div>
          </div>
          <div style={{ ...s.searchTitle, marginBottom: 2 }}>Çevrenizdeki {catObj?.label.toLowerCase() || "hizmet"} ustaları aranıyor…</div>
          <div style={s.searchSub}>{customer.fullName ? `${customer.fullName} için oluşturuldu` : "Talebiniz iletiliyor"}</div>
          <div style={s.callList}>
            {pool.slice(0, visibleCount).map((m) => (
              <div key={m.name} style={s.callRow}>
                <div style={s.matchAvatar}>{m.name.split(" ").map((n: string) => n[0]).join("")}</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.name}</div>
                  <div style={s.matchMeta}><Star size={11} color="var(--copper)" fill="var(--copper)" /> {m.rating} · {m.distance}</div>
                </div>
                <span style={s.callingTag}><span style={s.callingDot} /> Çağrılıyor</span>
              </div>
            ))}
          </div>
        </div>
      ) : matched ? (
        <div style={s.searchWrap}>
          <div style={s.matchBadge}><Check size={26} color="#FFF" strokeWidth={3} /></div>
          <div style={s.searchTitle}>{matched.name} talebi kabul etti!</div>
          <div style={s.searchSub}>{departureTime}'de yola çıktı</div>
          <div style={s.matchCard}>
            <div style={s.matchAvatar}>{matched.name.split(" ").map((n: string) => n[0]).join("")}</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{matched.name}</div>
              <div style={s.matchMeta}><Star size={12} color="var(--copper)" fill="var(--copper)" /> {matched.rating} · {matched.jobs} iş · {matched.distance}</div>
            </div>
            <span style={s.verifiedTag}><ShieldCheck size={12} color="var(--teal)" /> Doğrulandı</span>
          </div>
          <div style={s.departCard}>
            <DepartRow label="Yola çıkış saati" value={departureTime} />
            <DepartRow label="Tahmini varış" value={eta} />
            <DepartRow label="Telefon" value={matched.phone} last />
          </div>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <a href={`tel:${matched.phone.replace(/\s/g, "")}`} style={s.callBtn}><PhoneCall size={16} /> Ara</a>
            <button
              type="button"
              style={{ ...s.submitBtn, flex: 1, opacity: followPending ? 0.7 : 1 }}
              disabled={followPending}
              onClick={async () => {
                setFollowError("");
                setFollowPending(true);
                try {
                  await onDone(matched, departureTime);
                } catch (error) {
                  setFollowError(error instanceof Error ? error.message : "Talep kaydedilemedi. Lütfen tekrar deneyin.");
                } finally {
                  setFollowPending(false);
                }
              }}
            >
              {followPending ? "Talep kaydediliyor…" : "İşi Takip Et"} {!followPending && <ChevronRight size={17} />}
            </button>
          </div>
          {followError && <div className="request-action-error" role="alert">{followError}</div>}
        </div>
      ) : null}
    </div>
  );
}

function statusMeta(status: string) {
  if (status === "active") return { label: "Yolda", color: "var(--teal)" };
  if (status === "searching") return { label: "Usta aranıyor", color: "var(--copper)" };
  if (status === "cancelled" || status === "canceled" || status === "iptal") return { label: "İptal edildi", color: "var(--danger)" };
  if (status === "delivered") return { label: "Teslim bildirildi", color: "var(--copper)" };
  if (status === "absent") return { label: "Müşteri adreste yoktu", color: "var(--muted)" };
  if (status === "unreachable") return { label: "Müşteriye ulaşılamıyor", color: "var(--muted)" };
  return { label: "Tamamlandı", color: "var(--muted)" };
}

function JobsScreen({ jobs, onStart, onTrack, isProvider, onAction }: { jobs: any[]; onStart: (c: string | null) => void; onTrack: (j: any) => void; isProvider: boolean; onAction: (job: any, action: RequestAction, reason?: string) => void }) {
  const [filter, setFilter] = useState<"active" | "past" | "cancelled">("active");
  const isCancelled = (job: any) => ["cancelled", "canceled", "iptal"].includes(job.status);
  const activeJobs = jobs.filter((j) => !["done", "completed"].includes(j.status) && !isCancelled(j));
  const doneJobs = jobs.filter((j) => ["done", "completed"].includes(j.status));
  const cancelledJobs = jobs.filter(isCancelled);
  const visibleJobs = filter === "active" ? activeJobs : filter === "past" ? doneJobs : cancelledJobs;
  const filterTitle = filter === "active" ? "Aktif talepler" : filter === "past" ? "Geçmiş talepler" : "İptal edilen talepler";
  const emptyTitle = filter === "active" ? "Aktif talebiniz yok" : filter === "past" ? "Geçmiş talebiniz yok" : "İptal edilen talebiniz yok";
  const emptyDescription = filter === "active" ? "Bir sorun mu var? Birkaç adımda usta talebi oluşturun." : filter === "past" ? "Tamamlanan işleriniz burada görünecek." : "İptal ettiğiniz talepler burada görünecek.";
  return (
    <div style={s.screen}>
      <TopBar title="İşlerim" />
      <div style={s.sectionPad}>
        <div className="jobs-status-tabs" role="tablist" aria-label="Talep durumları">
          {([
            ["active", "Aktif", activeJobs.length],
            ["past", "Geçmiş", doneJobs.length],
            ["cancelled", "İptal", cancelledJobs.length],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`jobs-status-tab${filter === key ? " is-active" : ""}`}
              onClick={() => setFilter(key)}
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </div>
        <div style={s.sectionLabel}>{filterTitle} · {visibleJobs.length}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleJobs.map((j) => {
            const meta = statusMeta(j.status);
            return (
              <div
                key={j.id}
                style={{ ...s.jobCard, ...(filter === "active" && j.status === "active" ? s.jobCardClickable : {}), ...(filter !== "active" ? { opacity: 0.82 } : {}) }}
                role={filter === "active" && j.status === "active" ? "button" : undefined}
                tabIndex={filter === "active" && j.status === "active" ? 0 : undefined}
                onClick={() => { if (filter === "active" && j.status === "active") onTrack(j); }}
                onKeyDown={(event) => { if (filter === "active" && j.status === "active" && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onTrack(j); } }}
                aria-label={filter === "active" && j.status === "active" ? `${j.title} canlı takibini aç` : undefined}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{j.title}</div>
                  <span style={{ ...s.badge, background: meta.color }}>{meta.label}</span>
                </div>
                <div style={s.jobLoc}><MapPin size={12} color="var(--muted)" /> {j.loc}</div>
                {filter === "active" && j.status === "active" && (
                  <>
                    <div style={s.jobFooter}>
                      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{j.master} · {j.departureTime}'de yola çıktı · {j.eta}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <a href={j.masterPhone ? `tel:${j.masterPhone.replace(/\s/g, "")}` : undefined} style={{ ...s.callBtnSmall, ...(j.masterPhone ? {} : s.disabledCall) }} onClick={(event) => event.stopPropagation()} aria-disabled={!j.masterPhone}><PhoneCall size={13} /> Ara</a>
                      <button style={s.trackBtn} onClick={(event) => { event.stopPropagation(); onTrack(j); }}>Canlı Takip</button>
                    </div>
                    <div className="job-action-grid">
                      {isProvider ? (
                        <>
                          <button type="button" className="job-action job-action-primary" onClick={(event) => { event.stopPropagation(); onAction(j, "provider_delivered"); }}>İşi teslim ettim</button>
                          <button type="button" className="job-action" onClick={(event) => { event.stopPropagation(); onAction(j, "customer_absent", "Müşteri adreste yoktu"); }}>Müşteri adreste yoktu</button>
                          <button type="button" className="job-action" onClick={(event) => { event.stopPropagation(); onAction(j, "customer_unreachable", "Müşteriye ulaşılamıyor"); }}>Ulaşılamıyor</button>
                        </>
                      ) : (
                        <button type="button" className="job-action job-action-danger" onClick={(event) => { event.stopPropagation(); const reason = window.prompt("İptal gerekçeniz (isteğe bağlı):", "Artık hizmete ihtiyacım yok"); if (reason !== null) onAction(j, "customer_cancelled", reason); }}>Talebi iptal et</button>
                      )}
                    </div>
                  </>
                )}
                {filter === "active" && j.status === "delivered" && !isProvider && (
                  <div className="job-action-grid"><button type="button" className="job-action job-action-primary" onClick={() => onAction(j, "customer_received")}>İşi teslim aldım</button></div>
                )}
                {filter === "active" && ["absent", "unreachable"].includes(j.status) && (
                  <div className="job-protection-note"><ShieldCheck size={14} /> Bu durum puanınızı etkilemez.</div>
                )}
                {filter === "active" && j.status === "searching" && (
                  <div style={s.jobFooter}>
                    <span style={{ fontSize: 12.5, color: "var(--copper)", fontWeight: 600 }}>Size en uygun usta aranıyor…</span>
                  </div>
                )}
              </div>
            );
          })}
          {visibleJobs.length === 0 && (
            <div style={s.emptyCard}>
              <div style={s.emptyIconWrap}><Briefcase size={20} color="var(--muted)" /></div>
              <div style={s.emptyTitle}>{emptyTitle}</div>
              <div style={s.emptyDesc}>{emptyDescription}</div>
              {filter === "active" && <button style={s.emptyCta} onClick={() => onStart(null)}><Plus size={15} strokeWidth={2.5} /> Talep Oluştur</button>}
            </div>
          )}
        </div>
      </div>
      <div style={{ height: 90 }} />
    </div>
  );
}

function TileTrackingMap({
  customer,
  artisan,
  zoom = 14,
}: {
  customer: { lat: number; lng: number };
  artisan: { lat: number; lng: number };
  zoom?: number;
}) {
  const [mapZoom, setMapZoom] = useState(zoom);
  const [route, setRoute] = useState<Array<{ lat: number; lng: number }>>([artisan, customer]);
  useEffect(() => {
    let cancelled = false;
    const loadRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${artisan.lng},${artisan.lat};${customer.lng},${customer.lat}?overview=full&geometries=geojson`,
        );
        if (!response.ok) throw new Error("Route request failed");
        const data = await response.json();
        const coordinates = data.routes?.[0]?.geometry?.coordinates;
        if (!cancelled && Array.isArray(coordinates) && coordinates.length > 1) {
          setRoute(coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })));
        }
      } catch {
        if (!cancelled) setRoute([artisan, customer]);
      }
    };
    loadRoute();
    return () => { cancelled = true; };
  }, [artisan, customer]);

  const width = 1000;
  const height = 430;
  const map = useMemo(() => {
    const project = (point: { lat: number; lng: number }) => {
     const scale = 2 ** mapZoom;
      const x = ((point.lng + 180) / 360) * scale * 256;
      const y = ((1 - Math.asinh(Math.tan((point.lat * Math.PI) / 180)) / Math.PI) / 2) * scale * 256;
      return { x, y };
    };
    const center = project(customer);
    const baseX = Math.floor(center.x / 256) - 2;
    const baseY = Math.floor(center.y / 256) - 1;
    const customerPx = { x: project(customer).x - baseX * 256, y: project(customer).y - baseY * 256 };
    const artisanPx = { x: project(artisan).x - baseX * 256, y: project(artisan).y - baseY * 256 };
    const routePx = route.map((point) => {
      const projected = project(point);
      return `${projected.x - baseX * 256},${projected.y - baseY * 256}`;
    });
    const tiles = Array.from({ length: 20 }, (_, index) => {
      const x = baseX + (index % 5);
      const y = baseY + Math.floor(index / 5);
      const max = 2 ** zoom;
      return { x: ((x % max) + max) % max, y, key: `${x}-${y}` };
    });
    return { tiles, customerPx, artisanPx, routePx, offsetX: center.x - baseX * 256, offsetY: center.y - baseY * 256 };
  }, [customer, artisan, route, mapZoom]);

  const routePoints = map.routePx.join(" ");
  const canvasStyle = {
    width: 1280,
    height: 1280,
    left: `calc(50% - ${map.offsetX}px)`,
    top: `calc(50% - ${map.offsetY}px)`,
  } as React.CSSProperties;

  return (
    <div style={s.tileMap} aria-label="Usta ve müşteri canlı takip haritası">
      <div style={{ ...s.tileCanvas, ...canvasStyle }}>
        {map.tiles.map((tile) => (
          <img
            key={tile.key}
            alt=""
            src={`https://tile.openstreetmap.org/${mapZoom}/${tile.x}/${tile.y}.png`}
            style={{ position: "absolute", width: 256, height: 256, left: (tile.x - map.tiles[0].x) * 256, top: (tile.y - map.tiles[0].y) * 256 }}
          />
        ))}
        <svg style={s.tileRoute} viewBox="0 0 1280 1280" preserveAspectRatio="none">
          <polyline points={routePoints} fill="none" stroke="#17324D" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
          <polyline points={routePoints} fill="none" stroke="#087F73" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" />
        </svg>
        <div style={{ ...s.mapVehiclePin, left: map.artisanPx.x - 21, top: map.artisanPx.y - 21 }}>
          <Wrench size={16} color="#FFF" />
        </div>
        <div style={{ ...s.mapCustomerPin, left: map.customerPx.x - 17, top: map.customerPx.y - 17 }}>
          <HomeIcon size={15} color="#FFF" />
        </div>
      </div>
      <div style={s.tileMapControls}>
        <button type="button" aria-label="Yakınlaştır" style={s.tileMapControl} onClick={() => setMapZoom((value) => Math.min(18, value + 1))}>+</button>
        <button type="button" aria-label="Uzaklaştır" style={s.tileMapControl} onClick={() => setMapZoom((value) => Math.max(10, value - 1))}>−</button>
      </div>
      <div style={s.tileMapLegend}>
        <span><i style={{ ...s.legendDot, background: "var(--teal)" }} /> Usta</span>
        <span><i style={{ ...s.legendDot, background: "var(--navy)" }} /> Adresiniz</span>
      </div>
      <div style={s.tileMapAttribution}>© OpenStreetMap katkıcıları</div>
    </div>
  );
}

type NearbyUsta = {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  lat: number;
  lng: number;
  district?: string | null;
};

function distanceInKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadius = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function NearbyMastersScreen({ onClose, requestedLocation, onStartRequest }: { onClose: () => void; requestedLocation: { lat: number; lng: number } | null; onStartRequest: () => void }) {
  const [status, setStatus] = useState<"locating" | "loading" | "ready" | "error">("locating");
  const [error, setError] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [masters, setMasters] = useState<NearbyUsta[]>([]);
  const [selected, setSelected] = useState<NearbyUsta | null>(null);
  const [mapZoom, setMapZoom] = useState(12);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  const loadNearby = useCallback(async (nextLocation: { lat: number; lng: number }) => {
    setLocation(nextLocation);
    setStatus("loading");
    try {
      const { listNearbyProviders } = await import("@/lib/supabase");
      const { providers: rows, locations: liveRows } = await listNearbyProviders();
      const liveById = new Map(liveRows.map((row) => [Number(row.ustaId), row]));
      const nearby = rows
        .map((row): NearbyUsta => {
          const live = liveById.get(Number(row.id));
          return {
            ...row,
            ...(live ?? {}),
            id: Number(row.id ?? live?.ustaId),
            name: String(live?.ustaName ?? row.name ?? ""),
            specialty: String(live?.specialty ?? row.specialty ?? ""),
            lat: Number(live?.lat ?? row.lat),
            lng: Number(live?.lng ?? row.lng),
            rating: Number(row.rating ?? 0),
            reviewCount: Number(row.reviewCount ?? 0),
            isOnline: live ? true : Boolean(row.isOnline),
          } as NearbyUsta;
        })
        .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng) && Number.isFinite(row.id) && Boolean(row.name) && Boolean(row.specialty))
        .filter((row) => distanceInKm(nextLocation, row) <= 10)
        .sort((a, b) => distanceInKm(nextLocation, a) - distanceInKm(nextLocation, b));
      setMasters(nearby);
      setStatus("ready");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Ustalar aranırken bir sorun oluştu.");
      setStatus("error");
    }
  }, []);

  const searchNearby = useCallback((locationOverride?: { lat: number; lng: number }) => {
    if (locationOverride) {
      void loadNearby(locationOverride);
      return;
    }
    if (!navigator.geolocation) {
      setError("Bu telefon tarayıcısı konum özelliğini desteklemiyor.");
      setStatus("error");
      return;
    }
    setStatus("locating");
    setError("");
    try {
      navigator.geolocation.getCurrentPosition(async ({ coords }) => {
        const nextLocation = { lat: coords.latitude, lng: coords.longitude };
        void loadNearby(nextLocation);
      }, (geoError) => {
        const message = geoError.code === geoError.PERMISSION_DENIED
          ? "Yakındaki ustaları bulmak için tarayıcı adres çubuğundaki konum iznine izin verin."
          : geoError.code === geoError.TIMEOUT
            ? "GPS konumu geç algılandı. GPS açıkken tekrar deneyin."
            : "Konumunuz alınamadı. Tekrar deneyin.";
        setError(message);
        setStatus("error");
      }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
    } catch {
      setError("Konum isteği bu tarayıcıda başlatılamadı. Sayfa izinlerini kontrol edip tekrar deneyin.");
      setStatus("error");
    }
  }, [loadNearby]);

  const loadAllOnlineProviders = useCallback(async () => {
    setFallbackLoading(true);
    setError("");
    try {
      const { listNearbyProviders } = await import("@/lib/supabase");
      const { locations: rows } = await listNearbyProviders();
      const providers = rows
        .map((row) => ({
          id: Number(row.ustaId),
          name: String(row.ustaName ?? ""),
          specialty: String(row.specialty ?? "Hizmet veren"),
          rating: 0,
          reviewCount: 0,
          isOnline: true,
          lat: Number(row.lat),
          lng: Number(row.lng),
          district: undefined,
        }))
        .filter((row) => Number.isFinite(row.id) && Boolean(row.name) && Number.isFinite(row.lat) && Number.isFinite(row.lng)) as NearbyUsta[];
      setMasters(providers);
      setStatus("ready");
    } catch (fallbackError) {
      setError(fallbackError instanceof Error ? fallbackError.message : "Çevrimiçi ustalar alınamadı.");
    } finally {
      setFallbackLoading(false);
    }
  }, []);

  useEffect(() => {
    if (requestedLocation) searchNearby(requestedLocation);
  }, [requestedLocation, searchNearby]);

  const map = useMemo(() => {
    if (!location) return null;
    const project = (point: { lat: number; lng: number }) => {
      const scale = 2 ** mapZoom;
      return {
        x: ((point.lng + 180) / 360) * scale * 256,
        y: ((1 - Math.asinh(Math.tan((point.lat * Math.PI) / 180)) / Math.PI) / 2) * scale * 256,
      };
    };
    const center = project(location);
    const baseX = Math.floor(center.x / 256) - 2;
    const baseY = Math.floor(center.y / 256) - 2;
    const tiles = Array.from({ length: 25 }, (_, index) => {
      const rawX = baseX + (index % 5);
      const y = baseY + Math.floor(index / 5);
      const max = 2 ** mapZoom;
      return { x: ((rawX % max) + max) % max, y, rawX, key: `${rawX}-${y}` };
    });
    return { tiles, baseX, baseY, center: { x: center.x - baseX * 256, y: center.y - baseY * 256 }, project };
  }, [location, mapZoom]);

  return (
    <div className="nearby-screen">
      <div className="nearby-header">
        <button type="button" className="nearby-back" onClick={onClose} aria-label="Ana sayfaya dön"><ArrowLeft size={18} /></button>
        <div><strong>Yakınımdaki ustalar</strong><span>Konumunuza göre 10 km çevre taraması</span></div>
        <MapPin size={20} color="var(--copper)" />
      </div>
      {status === "locating" && <div className="nearby-status-card"><LocateFixed size={24} className="nearby-spin" /><strong>Konumunuz algılanıyor…</strong><span>Telefonunuzun GPS izni kullanılacak.</span></div>}
      {status === "loading" && <div className="nearby-status-card"><Radio size={24} className="nearby-spin" /><strong>10 km çevreniz taranıyor…</strong><span>Gerçek konumu kayıtlı ustalar aranıyor.</span></div>}
      {status === "error" && <div className="nearby-status-card nearby-status-error"><AlertTriangle size={24} /><strong>Konum alınamadı</strong><span>{error}</span><div className="nearby-error-actions"><button type="button" className="nearby-retry" onClick={() => searchNearby()}><LocateFixed size={15} /> Tekrar dene</button><button type="button" className="nearby-list-button" onClick={() => void loadAllOnlineProviders()} disabled={fallbackLoading}><Radio size={15} /> {fallbackLoading ? "Ustalar yükleniyor…" : "Çevrimiçi ustaları listele"}</button></div></div>}
      {status === "ready" && !location && masters.length > 0 && <div className="nearby-provider-list">{masters.map((master) => <div className="nearby-provider-card" key={master.id}><div><strong>{master.name}</strong><span>{master.specialty}{master.district ? ` · ${master.district}` : ""}</span></div><button type="button" onClick={onStartRequest}>Bu ustadan talep oluştur</button></div>)}</div>}
      {map && (
        <>
          <div className="nearby-map" aria-label="Konumunuza göre 10 kilometre çevredeki usta haritası">
            <div className="nearby-map-canvas" style={{ width: 1280, height: 1280, left: `calc(50% - ${map.center.x}px)`, top: `calc(50% - ${map.center.y}px)` }}>
              {map.tiles.map((tile) => <img key={tile.key} alt="" src={`https://tile.openstreetmap.org/${mapZoom}/${tile.x}/${tile.y}.png`} style={{ position: "absolute", width: 256, height: 256, left: (tile.rawX - map.baseX) * 256, top: (tile.y - map.baseY) * 256 }} />)}
              <div className="nearby-radius" style={{ left: map.center.x - 190, top: map.center.y - 190 }} />
              <div className="nearby-user-pin" style={{ left: map.center.x - 18, top: map.center.y - 18 }}><LocateFixed size={17} /></div>
              {masters.map((master) => {
                const point = map.project(master);
                return <button type="button" key={master.id} className={`nearby-master-pin ${selected?.id === master.id ? "is-selected" : ""}`} style={{ left: point.x - 17, top: point.y - 17 }} onClick={() => setSelected(master)} aria-label={`${master.name}, ${master.specialty}`}><Wrench size={14} /></button>;
              })}
            </div>
            <div className="nearby-radius-label">10 km arama alanı</div>
            <div className="nearby-map-controls"><button type="button" onClick={() => setMapZoom((value) => Math.min(17, value + 1))} aria-label="Yakınlaştır">+</button><button type="button" onClick={() => setMapZoom((value) => Math.max(10, value - 1))} aria-label="Uzaklaştır">−</button></div>
            <div className="nearby-attribution">© OpenStreetMap katkıcıları</div>
          </div>
          <div className="nearby-results">
            <div className="nearby-results-heading"><div><span>Konumunuza en yakın</span><strong>{masters.length} usta bulundu</strong></div><span className="nearby-location-pill"><MapPin size={13} /> GPS aktif</span></div>
            {selected && location && <div className="nearby-selected-card"><div><strong>{selected.name}</strong><span>{selected.specialty} · {distanceInKm(location, selected).toFixed(1)} km</span></div><span className={selected.isOnline ? "nearby-online" : "nearby-busy"}>{selected.isOnline ? "Müsait" : "Meşgul"}</span></div>}
            {!selected && masters.length === 0 && <div className="nearby-empty"><MapPin size={20} /><span>Bu 10 km alanda koordinatı doğrulanmış usta bulunamadı.</span></div>}
            {!selected && masters.length > 0 && <div className="nearby-hint">Haritadaki usta işaretlerine dokunarak ayrıntıları görüntüleyin.</div>}
            {selected && <button type="button" className="nearby-request-button" onClick={onStartRequest}>Bu ustadan talep oluştur</button>}
          </div>
        </>
      )}
    </div>
  );
}

function TrackingScreen({ job, onClose, isProvider, onAction }: { job: any; onClose: () => void; isProvider: boolean; onAction: (job: any, action: RequestAction, reason?: string) => void }) {
  const initialEta = parseInt(job.eta, 10) || 12;
  const [etaMin, setEtaMin] = useState(initialEta);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setEtaMin((m) => (m > 0 ? m - 1 : 0));
      setProgress((p) => Math.min(1, p + 1 / initialEta));
    }, 2200);
    return () => clearInterval(t);
  }, [initialEta]);

  const start = { top: 22, left: 78 };
  const end = { top: 66, left: 46 };
  const masterTop = start.top + (end.top - start.top) * progress;
  const masterLeft = start.left + (end.left - start.left) * progress;
  const arrived = etaMin <= 0;
  const customerLocation = job.customerLocation ?? { lat: 36.8874, lng: 30.7061 };
  const masterName = job.master || "Atanan usta";
  const masterPhone = typeof job.masterPhone === "string" ? job.masterPhone : "";
  const departureDate = job.departureDate || "Bugün";
  const estimatedArrival = arrived
    ? "Usta kapınızda"
    : new Date(Date.now() + etaMin * 60_000).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  // Keep both tracking points inside the OSM viewport with explicit padding
  // (the web demo's route point mirrors the live driver's current progress).
  const artisanLocation = {
    lat: customerLocation.lat + 0.006 * (1 - progress),
    lng: customerLocation.lng + 0.008 * (1 - progress),
  };
  return (
    <div className="tracking-screen" style={s.screen}>
      <TopBar title="Canlı Takip" onBack={onClose} />
      <div style={s.mapArea}>
        <TileTrackingMap customer={customerLocation} artisan={artisanLocation} />
         <div style={s.mapBadge}><Radio size={13} color="var(--teal)" /> {arrived ? "Usta kapınızda" : `${masterName} yolda · ${etaMin} dk`}</div>
      </div>
      <div style={s.sectionPad}>
        <div style={s.sectionLabel}>Usta bilgileri</div>
         <div style={s.trackingInfoCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
             <div style={s.matchAvatar}>{masterName.split(" ").map((n: string) => n[0]).join("")}</div>
            <div style={{ flex: 1 }}>
               <div style={{ fontWeight: 700, fontSize: 14.5 }}>{masterName}</div>
               <div style={s.matchMeta}>{masterPhone || "Telefon bilgisi paylaşılmadı"}</div>
            </div>
             {masterPhone ? (
               <a href={`tel:${masterPhone.replace(/\s/g, "")}`} style={s.callBtnSmall} aria-label={`${masterName} ustayı ara`}><PhoneCall size={13} /> Ara</a>
             ) : (
               <span style={s.phoneUnavailable}>Telefon yok</span>
             )}
          </div>
           <div style={s.trackingDetails}>
             <ReviewRow label="Yola çıkış" value={`${departureDate} · ${job.departureTime || "Saat bilgisi yok"}`} />
             <ReviewRow label="Tahmini varış" value={estimatedArrival} last />
           </div>
        </div>
      </div>
      <div style={s.sectionPad}>
        <div style={s.sectionLabel}>Paylaşılan bilgileriniz</div>
        <div style={s.reviewCard}>
          <ReviewRow label="Ad Soyad" value={job.customerName || "—"} />
          <ReviewRow label="Telefon" value={job.customerPhone || "—"} />
          <ReviewRow label="Adres" value={job.loc} last />
        </div>
        <div className="tracking-live-location">
          <LiveLocationCard address={job.loc} />
        </div>
         {job.status === "active" && (
           <div className="tracking-actions">
             {isProvider ? (
               <>
                 <button type="button" className="job-action job-action-primary" onClick={() => onAction(job, "provider_delivered")}>İşi teslim ettim</button>
                 <button type="button" className="job-action" onClick={() => onAction(job, "customer_absent", "Müşteri adreste yoktu")}>Müşteri adreste yoktu</button>
                 <button type="button" className="job-action" onClick={() => onAction(job, "customer_unreachable", "Müşteriye ulaşılamıyor")}>Müşteriye ulaşılamıyor</button>
               </>
             ) : (
               <button type="button" className="job-action job-action-danger" onClick={() => { const reason = window.prompt("İptal gerekçeniz (isteğe bağlı):", "Artık hizmete ihtiyacım yok"); if (reason !== null) onAction(job, "customer_cancelled", reason); }}>Talebi iptal et</button>
             )}
           </div>
         )}
         {job.status === "delivered" && !isProvider && <button type="button" className="job-action job-action-primary tracking-receive-button" onClick={() => onAction(job, "customer_received")}>İşi teslim aldım</button>}
         {["absent", "unreachable"].includes(job.status) && <div className="job-protection-note"><ShieldCheck size={15} /> Ulaşılamama kaydı nedeniyle puan koruması aktif.</div>}
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

function MapTab() {
  const [sel, setSel] = useState(0);
  return (
    <div style={s.screen}>
      <TopBar title="Harita" />
      <div style={s.mapArea}>
        <div style={s.mapGrid} />
        {MASTERS.map((m, i) => (
          <button key={m.name} onClick={() => setSel(i)}
            style={{ ...s.pin, top: m.top, left: m.left, background: m.status === "Müsait" ? "var(--teal)" : "var(--muted)", transform: `translate(-50%,-50%) scale(${sel === i ? 1.25 : 1})`, zIndex: sel === i ? 3 : 1 }}>
            <MapPin size={16} color="#FFF" fill={sel === i ? "#FFF" : "none"} />
          </button>
        ))}
        <div style={s.mapBadge}><Radio size={13} color="var(--teal)" /> {MASTERS.filter((m) => m.status === "Müsait").length} usta müsait</div>
      </div>
      <div style={s.sectionPad}>
        <div style={s.sectionLabel}>Yakındaki ustalar</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MASTERS.map((m, i) => (
            <button key={m.name} onClick={() => setSel(i)} style={{ ...s.masterCard, ...(sel === i ? s.masterCardActive : {}) }}>
              <div style={s.matchAvatar}>{m.name.split(" ").map((n: string) => n[0]).join("")}</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{m.name}</div>
                <div style={s.matchMeta}>{m.service} · <Star size={11} color="var(--copper)" fill="var(--copper)" /> {m.rating} · {m.jobs} iş</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.distance}</div>
                <div style={{ ...s.statusPill, background: m.status === "Müsait" ? "var(--teal)" : "var(--border)", color: m.status === "Müsait" ? "#FFF" : "var(--muted)" }}>{m.status}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 90 }} />
    </div>
  );
}

function NavBtn({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`app-nav-btn${active ? " is-active" : ""}`} data-testid={`button-nav-${label.replace(/\s+/g, "-").toLowerCase()}`} onClick={onClick} style={s.navBtn} aria-label={label} aria-current={active ? "page" : undefined}>
      <Icon size={19} color={active ? "var(--navy)" : "var(--muted)"} strokeWidth={active ? 2.4 : 2} />
      <span style={{ fontSize: 10.5, color: active ? "var(--navy)" : "var(--muted)", fontWeight: active ? 700 : 500 }}>{label}</span>
      {active && <span style={s.navDot} />}
    </button>
  );
}

function NotificationsScreen({ jobs, onStart, isProvider }: { jobs: any[]; onStart: () => void; isProvider: boolean }) {
  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div>
          <div style={s.pageTitle}>Bildirimler</div>
          <div style={s.pageSubtitle}>Taleplerinizle ilgili güncellemeler</div>
        </div>
        <Bell size={20} color="var(--teal)" />
      </div>
      <div style={s.sectionPad}>
        {jobs.length === 0 ? (
          <div style={s.emptyState}>
            <Bell size={28} color="var(--muted)" />
            <strong>Henüz bildirim yok</strong>
            <span>Yeni talep ve durum güncellemeleri burada görünecek.</span>
            <button style={s.emptyCta} onClick={onStart}>{isProvider ? <MapIcon size={15} /> : <Plus size={15} />} {isProvider ? "İş fırsatlarını gör" : "Talep Oluştur"}</button>
          </div>
        ) : jobs.map((job) => (
          <div key={job.id} style={s.notificationCard}>
            <div style={s.notificationIcon}><Bell size={16} color="var(--teal)" /></div>
            <div style={{ flex: 1 }}>
              <strong style={{ color: "var(--text)", display: "block", fontSize: 14 }}>Talep güncellemesi</strong>
              <span style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.45 }}>
                {job.title}: {job.status === "active" ? "Talebiniz alındı; uygun uzmanları arıyoruz." : "Talebiniz için yeni bir güncelleme var."}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleOnboarding({ onSelect }: { onSelect: (role: ActiveRole) => void }) {
  return (
    <div className="role-onboarding" role="dialog" aria-modal="true" aria-labelledby="role-onboarding-title">
      <div className="role-onboarding-panel">
        <div className="role-onboarding-kicker">USTA CEPTE</div>
        <h1 id="role-onboarding-title">Nasıl devam etmek istersiniz?</h1>
        <p>Hesabınız hazır. Size uygun çalışma alanını seçin; daha sonra Hesabım bölümünden değiştirebilirsiniz.</p>
        <div className="role-onboarding-choices">
          <button type="button" className="role-choice role-choice-customer" data-testid="button-role-customer" onClick={() => onSelect("customer")}>
            <span className="role-choice-label">Müşteri</span>
            <strong>Hizmet Almak İstiyorum</strong>
            <span className="role-choice-arrow" aria-hidden="true"><ChevronRight size={20} /></span>
          </button>
          <button type="button" className="role-choice role-choice-usta" data-testid="button-role-usta" onClick={() => onSelect("usta")}>
            <span className="role-choice-label">Usta Hesabı Oluştur</span>
            <strong>Hizmet Vermek / Ustayım</strong>
            <span className="role-choice-arrow" aria-hidden="true"><ChevronRight size={20} /></span>
          </button>
        </div>
      </div>
    </div>
  );
}

type ProfileMedia = { id: string; dataUrl: string; name: string };

function readProfileMedia(key: string): ProfileMedia[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is ProfileMedia => Boolean(item?.id && item?.dataUrl)) : [];
  } catch {
    return [];
  }
}

async function resizeProfileImage(file: File): Promise<string> {
  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Fotoğraf okunamadı."));
    image.src = URL.createObjectURL(file);
  });
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(source.naturalWidth, source.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function MediaManager({
  title,
  description,
  emptyText,
  media,
  onAdd,
  onRemove,
  testId,
}: {
  title: string;
  description: string;
  emptyText: string;
  media: ProfileMedia[];
  onAdd: (file?: File) => void;
  onRemove: (id: string) => void;
  testId: string;
}) {
  return (
    <section className="account-media-section" aria-label={title}>
      <div className="account-media-heading">
        <span className="account-media-icon"><ImageIcon size={16} /></span>
        <span><strong>{title}</strong><small>{description}</small></span>
        <label className="account-media-add" data-testid={testId}>
          <Plus size={14} /> Fotoğraf ekle
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { onAdd(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        </label>
      </div>
      {media.length ? (
        <div className="account-media-grid">
          {media.map((item) => (
            <div className="account-media-item" key={item.id}>
              <img src={item.dataUrl} alt={item.name || title} />
              <button type="button" onClick={() => onRemove(item.id)} aria-label={`${item.name || "Fotoğraf"} sil`}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      ) : <div className="account-media-empty"><ImageIcon size={17} /><span>{emptyText}</span></div>}
    </section>
  );
}

function AccountModal({
  name,
  activeRole,
  onClose,
  onSave,
  onSelectRole,
  onBecomeProvider,
  onOpenProviderRegistration,
  onOpenNotifications,
  jobs,
  onSignOut,
  onDelete,
}: {
  name: string;
  activeRole: ActiveRole;
  onClose: () => void;
  onSave: (name: string, account?: { active?: boolean }) => void;
  onSelectRole: (role: ActiveRole) => void;
  onBecomeProvider: () => void;
  onOpenProviderRegistration: (panel: string) => void;
  onOpenNotifications: () => void;
  jobs: any[];
  onSignOut: () => void;
  onDelete: () => void;
}) {
  const [account, setAccount] = useState<StoredAccount>(() => readStoredAccount() ?? {});
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [providerChoiceOpen, setProviderChoiceOpen] = useState(false);
  const [accountSection, setAccountSection] = useState<"main" | "notifications" | "support" | "privacy" | "membership">("main");
  const [photo, setPhoto] = useState(() => window.localStorage.getItem("usta-cepte-profile-photo") ?? "");
  const [personalPhotos, setPersonalPhotos] = useState<ProfileMedia[]>(() => readProfileMedia("usta-cepte-personal-photos"));
  const [portfolioPhotos, setPortfolioPhotos] = useState<ProfileMedia[]>(() => readProfileMedia("usta-cepte-portfolio-photos"));
  const isLoggedIn = Boolean(account?.active || (name && name !== "Misafir"));
  const isProvider = normalizeAccountRole(account.role) === "usta";
  const isAdmin = account.role === "admin" || isPrivilegedAdminEmail(account.email);
  const displayName = account?.name || name;
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "B";
  useEffect(() => {
    setDraftEmail(account?.email ?? "");
    setDraftPhone(account?.phone ?? "");
  }, [account?.email, account?.phone]);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);
  const saveAccountProfile = () => {
    const nextName = draftName.trim();
    if (!nextName) return;
    const nextAccount = { ...(account ?? {}), name: nextName, email: draftEmail.trim() || account?.email || "", phone: draftPhone.trim(), active: true };
    window.localStorage.setItem("usta-cepte-account", JSON.stringify(nextAccount));
    window.localStorage.setItem("usta-cepte-profile-name", nextName);
    setAccount(nextAccount);
    onSave(nextName, nextAccount);
  };
  const addMedia = async (file: File | undefined, type: "personal" | "portfolio") => {
    if (!file || !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return;
    const current = type === "personal" ? personalPhotos : portfolioPhotos;
    const max = type === "personal" ? 6 : 12;
    if (current.length >= max) return;
    try {
      const dataUrl = await resizeProfileImage(file);
      const next = [...current, { id: `${Date.now()}-${file.name}`, dataUrl, name: file.name }];
      if (type === "personal") {
        setPersonalPhotos(next);
        window.localStorage.setItem("usta-cepte-personal-photos", JSON.stringify(next));
      } else {
        setPortfolioPhotos(next);
        window.localStorage.setItem("usta-cepte-portfolio-photos", JSON.stringify(next));
      }
      window.dispatchEvent(new Event("usta-cepte-profile-media-changed"));
    } catch {
      // Invalid image files are ignored by the browser preview.
    }
  };
  const removeMedia = (id: string, type: "personal" | "portfolio") => {
    const current = type === "personal" ? personalPhotos : portfolioPhotos;
    const next = current.filter((item) => item.id !== id);
    if (type === "personal") {
      setPersonalPhotos(next);
      window.localStorage.setItem("usta-cepte-personal-photos", JSON.stringify(next));
    } else {
      setPortfolioPhotos(next);
      window.localStorage.setItem("usta-cepte-portfolio-photos", JSON.stringify(next));
    }
    window.dispatchEvent(new Event("usta-cepte-profile-media-changed"));
  };
  const handleRoleAction = () => {
    if (activeRole === "usta") {
      onSelectRole("customer");
    } else if (isProvider) {
      onSelectRole("usta");
    } else {
      setProviderChoiceOpen(true);
    }
  };
  const login = async () => {
    setLoginError("");
    const email = loginEmail.trim();
    const password = loginPassword;
    if (!email) {
      setLoginError("E-posta adresinizi girin.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoginError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (!password.trim()) {
      setLoginError("Şifrenizi girin.");
      return;
    }
    if (password.length < 6) {
      setLoginError("Şifreniz en az 6 karakter olmalı.");
      return;
    }
    setLoginPending(true);
    try {
      const result = await signInWithPassword(email, password);
      const profile = { ...(result.profile as { id?: string; name?: string; email?: string; phone?: string; role?: string; active?: boolean }) };
      const authenticatedProfile = { ...profile, id: profile.id ? Number(profile.id) : undefined, email: profile.email ?? email, active: true };
      window.localStorage.setItem("usta-cepte-account", JSON.stringify(authenticatedProfile));
      setAccount(authenticatedProfile);
       setDraftName(authenticatedProfile.name ?? "");
       setDraftEmail(authenticatedProfile.email ?? email);
       setDraftPhone(authenticatedProfile.phone ?? "");
       onSave(authenticatedProfile.name ?? email.split("@")[0], authenticatedProfile);
      setLoginPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setLoginError(/invalid login credentials/i.test(message)
        ? "E-posta veya şifre hatalı. Bilgilerinizi kontrol edin ya da şifrenizi sıfırlayın."
        : /failed to fetch|networkerror|fetch failed/i.test(message)
        ? "Supabase sunucusuna ulaşılamadı. Supabase proje URL'sini kontrol edin."
        : message || "Giriş yapılamadı.");
    } finally {
      setLoginPending(false);
    }
  };
  const resetPassword = async () => {
    const email = loginEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoginError("Şifre sıfırlamak için geçerli e-posta adresinizi girin.");
      return;
    }
    setResetPending(true);
    setLoginError("");
    try {
      await sendPasswordReset(email);
      setInfoMessage("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Şifre sıfırlama bağlantısı gönderilemedi.");
    } finally {
      setResetPending(false);
    }
  };
  return (
    <div className="account-overlay-backdrop" style={s.accountOverlay} role="dialog" aria-modal="true" aria-label="Hesabım" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="account-modal" style={s.accountModal} onClick={(event) => event.stopPropagation()}>
        <div className="account-modal-toolbar" aria-label="Hesap ekranı gezinme">
          <button type="button" className="account-back" data-testid="button-account-back" onClick={() => { if (editOpen) setEditOpen(false); else if (providerChoiceOpen) setProviderChoiceOpen(false); else if (accountSection !== "main") setAccountSection("main"); else onClose(); }} aria-label={editOpen || providerChoiceOpen || accountSection !== "main" ? "Hesap seçeneklerine dön" : "Hesabı kapat"}>
            <ArrowLeft size={18} />
          </button>
        </div>
         <div className="account-avatar" style={s.accountAvatar} aria-hidden="true">
          {photo ? <img src={photo} alt="Profil" style={s.accountAvatarImage} /> : <User size={25} color="var(--teal)" />}
         </div>
        <h2 className="account-title" style={s.accountTitle}>{accountSection === "notifications" ? "Bildirimler" : accountSection === "support" ? "Canlı destek" : accountSection === "privacy" ? "Gizlilik ve güvenlik" : accountSection === "membership" ? "Üyelik işlemleri" : isLoggedIn ? `Merhaba, ${displayName}` : "Hesap İşlemleri"}</h2>
         <span className="account-hint" style={s.accountHint}>{isLoggedIn ? "Hesabınız ve tercihleriniz" : "Giriş yaparak taleplerinizi ve hizmetlerinizi yönetin"}</span>
         {accountSection !== "main" && (
          <section className="account-subpage" aria-label="Hesap alt ekranı">
            {accountSection === "notifications" && (
               <NotificationsScreen jobs={jobs} onStart={activeRole === "usta" ? () => onOpenNotifications() : () => onOpenNotifications()} isProvider={activeRole === "usta"} />
            )}
            {accountSection === "support" && (
               <SupportChat initialName={displayName} />
            )}
            {accountSection === "privacy" && (
               <PrivacyContent />
            )}
            {accountSection === "membership" && (
              <>
                 <strong>Üyelik iptal talebi</strong>
                 <p>Talebinizi destek ekibimize iletin. Mesaj kutusu, üyelik iptal talebi konusu ile hazır açılır.</p>
                 <SupportChat initialName={displayName} initialMessage="Üyelik iptal talebi oluşturmak istiyorum. Lütfen hesabımın kapatılması için izlenecek adımları paylaşır mısınız?" />
              </>
            )}
          </section>
        )}
        {accountSection === "main" && <>
         <div className="account-profile-card" style={s.accountProfileCard}>
           <div className="account-profile-badge" style={s.accountProfileBadge}>{isLoggedIn ? initials : <User size={22} color="#FFF" />}</div>
           <div style={{ minWidth: 0, flex: 1 }}>
             {isLoggedIn ? (
               <>
                 <span style={s.accountProfileRole}>{activeRole === "usta" ? "Usta hesabı" : "Müşteri hesabı"}</span>
                 <strong style={s.accountProfileName}>{displayName}</strong>
                 <span style={s.accountProfileMeta}>Antalya · Usta Cepte {activeRole === "usta" ? "ustası" : "müşterisi"}</span>
               </>
             ) : <span style={s.accountProfileRole}>Giriş yapılmadı</span>}
           </div>
           {isLoggedIn && <ShieldCheck className="account-profile-shield" size={26} color="var(--copper)" strokeWidth={1.9} aria-label="Doğrulanmış hesap" />}
         </div>
        {!isLoggedIn ? (
          <form style={s.accountGuest} onSubmit={(event) => { event.preventDefault(); void login(); }}>
            <p style={s.accountGuestText}>Taleplerinizi takip etmek ve hizmet almak veya vermek için hesabınıza giriş yapın.</p>
            <label htmlFor="account-login-email" style={s.visuallyHidden}>E-posta adresi</label>
            <input id="account-login-email" data-testid="input-login-email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} style={s.accountInput} placeholder="E-posta" type="email" autoComplete="email" aria-label="E-posta adresi" aria-invalid={Boolean(loginError)} />
            <label htmlFor="account-login-password" style={s.visuallyHidden}>Şifre</label>
            <input id="account-login-password" data-testid="input-login-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} style={{ ...s.accountInput, marginTop: 8 }} placeholder="Şifre" type="password" autoComplete="current-password" aria-label="Şifre" aria-invalid={Boolean(loginError)} />
            {loginError && <div role="alert" style={s.accountLoginError}>{loginError}</div>}
            <button type="submit" data-testid="button-login" style={{ ...s.accountLogin, marginTop: 10 }} disabled={loginPending} aria-busy={loginPending}>
              {loginPending ? "Giriş yapılıyor..." : "Giriş Yap"} <ArrowRight size={16} />
            </button>
            <button type="button" data-testid="button-forgot-password" style={s.accountRegisterLink} onClick={() => { void resetPassword(); }} disabled={resetPending}>
              {resetPending ? "Bağlantı gönderiliyor..." : "Şifremi unuttum"}
            </button>
                <button type="button" data-testid="button-register-customer" style={s.accountRegisterLink} onClick={() => { window.location.href = appPath("kayit?panel=musteri-kayit"); }}>
              Yeni müşteri hesabı oluştur
            </button>
          </form>
        ) : (
          <div className="account-menu" style={s.accountMenu}>
            {editOpen ? (
              <div className="account-edit-panel">
                <label htmlFor="account-name" style={s.accountLabel}>Ad Soyad</label>
                <input id="account-name" data-testid="input-account-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} style={s.accountInput} placeholder="Adınız soyadınız" autoComplete="name" aria-label="Ad soyad" />
                <label htmlFor="account-email" style={s.accountLabel}>E-posta</label>
                <input id="account-email" data-testid="input-account-email" value={draftEmail} onChange={(event) => setDraftEmail(event.target.value)} style={s.accountInput} placeholder="E-posta adresiniz" type="email" autoComplete="email" aria-label="E-posta adresi" />
                <label htmlFor="account-phone" style={s.accountLabel}>Telefon</label>
                <input id="account-phone" data-testid="input-account-phone" value={draftPhone} onChange={(event) => setDraftPhone(event.target.value)} style={s.accountInput} placeholder="Telefon bilgisi ekleyin" type="tel" autoComplete="tel" aria-label="Telefon numarası" />
                 <MediaManager
                   title="Kişisel fotoğraflarım"
                   description="İsterseniz profilinizi tanıtmak için fotoğraf ekleyin."
                   emptyText="Henüz kişisel fotoğraf eklemediniz."
                   media={personalPhotos}
                   onAdd={(file) => void addMedia(file, "personal")}
                   onRemove={(id) => removeMedia(id, "personal")}
                   testId="input-personal-photo"
                 />
                 {isProvider && <MediaManager
                   title="Yaptığım işler"
                   description="Müşterilerin görebileceği iş ve proje fotoğrafları."
                   emptyText="Yaptığınız işleri göstermek için fotoğraf ekleyin."
                   media={portfolioPhotos}
                   onAdd={(file) => void addMedia(file, "portfolio")}
                   onRemove={(id) => removeMedia(id, "portfolio")}
                   testId="input-portfolio-photo"
                 />}
                <div className="account-edit-actions">
                  <button type="button" className="account-cancel-edit" onClick={() => setEditOpen(false)}>Vazgeç</button>
                  <button type="button" data-testid="button-save-profile" style={s.accountSave} onClick={() => { saveAccountProfile(); setEditOpen(false); }}>Profili kaydet</button>
                </div>
              </div>
            ) : (
              <>
              {!providerChoiceOpen && (
              <div className="account-menu-list">
                {isAdmin && <button type="button" className="account-menu-row" data-testid="button-admin-panel" onClick={() => { window.location.href = appPath("admin"); }}>
                  <span className="account-menu-row-copy"><span className="account-menu-row-icon"><ShieldCheck size={18} /></span><span><strong>Admin paneli</strong><small>Hesapları ve talepleri yönet</small></span></span><ChevronRight size={19} />
                </button>}
                <button type="button" className="account-menu-row" data-testid="button-account-settings" onClick={() => setEditOpen(true)}>
                  <span className="account-menu-row-copy"><span className="account-menu-row-icon"><Settings size={18} /></span><span><strong>Hesap ayarları</strong><small>İletişim ve adres bilgilerini düzenle</small></span></span><ChevronRight size={19} />
                </button>
                <button type="button" className="account-menu-row" data-testid="button-start-provider-registration" onClick={() => setProviderChoiceOpen((current) => !current)}>
                  <span className="account-menu-row-copy"><span className="account-menu-row-icon"><Wrench size={18} /></span><span><strong>Hizmet vermek istiyorum</strong><small>Usta, temizlik veya nakliye başvurusu başlat</small></span></span><ChevronRight size={19} />
                </button>
                <button type="button" className="account-menu-row" data-testid="button-account-notifications" onClick={() => setAccountSection("notifications")}>
                  <span className="account-menu-row-copy"><span className="account-menu-row-icon"><Bell size={18} /></span><span><strong>Bildirimler</strong><small>Talep ve hizmet güncellemelerini görüntüle</small></span></span><ChevronRight size={19} />
                </button>
                <button type="button" className="account-menu-row" data-testid="button-privacy-security" onClick={() => setAccountSection("privacy")}>
                  <span className="account-menu-row-copy"><span className="account-menu-row-icon"><ShieldCheck size={18} /></span><span><strong>Gizlilik ve güvenlik</strong><small>Bilgilerin güvende</small></span></span><ChevronRight size={19} />
                </button>
                <button type="button" className="account-menu-row" data-testid="button-support" onClick={() => setAccountSection("support")}>
                  <span className="account-menu-row-copy"><span className="account-menu-row-icon"><Phone size={18} /></span><span><strong>Destek</strong><small>Bir sorunuz mu var?</small></span></span><ChevronRight size={19} />
                </button>
                <button type="button" className="account-menu-row account-membership-cancel-row" data-testid="button-membership-cancel" onClick={() => setAccountSection("membership")}>
                  <span className="account-menu-row-copy"><span className="account-menu-row-icon"><CircleAlert size={18} /></span><span><strong>Üyelik iptal talebi</strong><small>Üyeliğinizi sonlandırmak için destek ekibine başvurun</small></span></span><ChevronRight size={19} />
                </button>
                <button type="button" className="account-menu-row account-menu-row-danger" data-testid="button-logout" onClick={onSignOut}>
                  <span className="account-menu-row-copy"><span className="account-menu-row-icon"><LogOut size={18} /></span><span><strong>Çıkış yap</strong><small>Bu cihazdaki hesabı kapat</small></span></span><ChevronRight size={19} />
                </button>
                <button type="button" className="account-menu-row account-menu-row-danger account-delete-row" data-testid="button-delete-account" onClick={onDelete}>
                  <span className="account-menu-row-copy"><span className="account-menu-row-icon"><Trash2 size={18} /></span><span><strong>Hesabımı sil</strong><small>Hesabınızı kapatın ve cihazdaki bilgileri temizleyin</small></span></span><ChevronRight size={19} />
                </button>
              </div>
              )}
            {providerChoiceOpen && (
              <div className="provider-choice-panel">
                <div className="provider-choice-heading">
                  <strong>Hangi hizmeti vermek istiyorsunuz?</strong>
                  <span>Size uygun başvuru panelini seçin.</span>
                </div>
                {[
                  { panel: "usta-kayit", title: "Usta olarak başvur", detail: "Branşlarınızı ve hizmet bölgelerinizi seçin.", icon: Wrench },
                  { panel: "temizlik-kayit", title: "Ev temizliği hizmeti ver", detail: "Temizlik kapsamınızı ve ekip bilgilerinizi ekleyin.", icon: SprayCan },
                  { panel: "nakliyeci-kayit", title: "Nakliyeci olarak başvur", detail: "Araç, ehliyet ve taşıma bilgilerinizi ekleyin.", icon: Truck },
                  { panel: "site-kayit", title: "Site yönetimi hesabı oluştur", detail: "Apartman veya siteniz için yönetim hesabı açın.", icon: Building2 },
                ].map(({ panel, title, detail, icon: Icon }) => (
                  <button key={panel} type="button" className="provider-choice-row" onClick={() => onOpenProviderRegistration(panel)}>
                    <span className="provider-choice-icon"><Icon size={17} /></span>
                    <span><strong>{title}</strong><small>{detail}</small></span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
            )}
              </>
            )}
            {!editOpen && (
              <button type="button" className="account-role-switch" data-testid="button-role-switch" onClick={handleRoleAction}>
                <Repeat size={15} /> {activeRole === "usta" ? "Müşteri görünümüne geç" : isProvider ? "Usta görünümüne geç" : "Usta hesabı oluştur"} <ChevronRight size={15} />
              </button>
            )}
            {infoMessage && <div role="status" style={s.accountInfoMessage}>{infoMessage}</div>}
          </div>
        )}
        </>}
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export default function AppDemo() {
  const initialRole = getInitialActiveRole();
  const [tab, setTab] = useState(initialRole === "usta" ? "map" : "home");
  const [accountOpen, setAccountOpen] = useState(() => new URLSearchParams(window.location.search).get("account") === "1" && Boolean(initialRole));
  const [profileName, setProfileName] = useState(() => window.localStorage.getItem("usta-cepte-profile-name") ?? "Misafir");
  const [accountActive, setAccountActive] = useState(() => {
    return Boolean(readStoredAccount()?.active);
  });
  const [activeRole, setActiveRole] = useState<ActiveRole | null>(initialRole);
  const [onboardingOpen, setOnboardingOpen] = useState(() => Boolean(readStoredAccount()?.active) && !initialRole);
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowCat, setFlowCat] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>(seedJobs);
  const [trackingJob, setTrackingJob] = useState<any>(null);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [nearbyLocation, setNearbyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const nextId = useRef(3);

  useEffect(() => {
    const openAccount = () => setAccountOpen(true);
    window.addEventListener("usta-cepte-open-account", openAccount);
    return () => window.removeEventListener("usta-cepte-open-account", openAccount);
  }, []);

  useEffect(() => {
    if (accountActive && activeRole && !normalizeActiveRole(window.localStorage.getItem("usta-cepte-active-role"))) {
      window.localStorage.setItem("usta-cepte-active-role", activeRole);
    }
  }, [accountActive, activeRole]);

  const startFlow = (cat: string | null) => { setFlowCat(cat); setFlowOpen(true); };
  const openNearby = () => {
    setNearbyOpen(true);
    setNearbyLocation(null);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setNearbyLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => setNearbyLocation(null),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
    );
  };

  const handleSubmit = async (data: any) => {
    const id = nextId.current++;
    const selectedCategoryNames = (data.selectedCats ?? [data.cat]).map((key: string) => CATEGORIES.find((category) => category.key === key)?.label).filter(Boolean);
    const requestTitle = data.title || selectedCategoryNames.join(" + ") || data.catObj?.label || "Yeni Talep";
    try {
      const createdRequest = await createServiceRequest({
        title: requestTitle,
        description: [data.serviceDetail, data.houseType, data.cleaningTeamSize, data.sundurmaMetraj].filter(Boolean).join(" · "),
        categoryId: data.cat ?? "diger",
        categoryName: selectedCategoryNames.join(" + ") || data.catObj?.label || "Hizmet",
        priority: data.priority,
        timeRange: data.slot,
        address: data.address,
        customerName: data.fullName,
        latitude: data.customerLocation?.lat,
        longitude: data.customerLocation?.lng,
        photos: data.mediaNames,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Talep kaydedilemedi.";
      window.dispatchEvent(new CustomEvent("usta-cepte-toast", { detail: { message } }));
      if (/giriş yapmalısınız|oturum/i.test(message)) {
        setFlowOpen(false);
        setAccountOpen(true);
      }
      throw error;
    }
    const nextJob = {
      id,
      requestId: createdRequest?.id ?? id,
      title: requestTitle,
      loc: data.address,
      customerName: data.fullName,
      customerPhone: data.phone,
      customerLocation: data.customerLocation,
      status: "active",
      master: data.matched?.name,
      masterPhone: data.matched?.phone,
      departureTime: data.departureTime,
      eta: `${Math.max(4, Math.round(parseFloat(data.matched?.distance || 1) * 6))} dk`,
    };
    setJobs((prev) => [nextJob, ...prev]);
    setFlowOpen(false);
    setTab("jobs");
    setTrackingJob(nextJob);
  };

  const handleJobAction = async (job: any, action: RequestAction, reason?: string) => {
    if (action === "customer_cancelled") {
      setTrackingJob(null);
      setTab("jobs");
    }
    try {
      const updated = await updateServiceRequestAction(Number(job.requestId ?? job.id), action, reason);
      const nextStatus = action === "provider_delivered" ? "delivered"
        : action === "customer_received" ? "done"
          : action === "customer_cancelled" ? "cancelled"
            : action === "customer_absent" ? "absent" : "unreachable";
      const nextJob = { ...job, status: nextStatus, lifecycleStatus: updated.status, actionReason: reason };
      setJobs((prev) => prev.map((item) => item.id === job.id ? nextJob : item));
      setTrackingJob((current: any) => current?.id === job.id ? nextJob : current);
      window.dispatchEvent(new CustomEvent("usta-cepte-toast", { detail: { message: action === "customer_received" ? "İş tamamlandı olarak kaydedildi." : "İş durumu karşı tarafa bildirildi." } }));
      if (nextStatus === "done" || nextStatus === "cancelled" || nextStatus === "absent" || nextStatus === "unreachable") {
        setTrackingJob(null);
        setTab("jobs");
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent("usta-cepte-toast", { detail: { message: error instanceof Error ? error.message : "İşlem gerçekleştirilemedi." } }));
    }
  };

  useEffect(() => subscribeToRequestUpdates(() => {
    window.dispatchEvent(new CustomEvent("usta-cepte-toast", { detail: { message: "Talep durumu güncellendi." } }));
  }), []);

  const openJob = (job: any) => { if (["active", "delivered"].includes(job.status)) setTrackingJob(job); else setTab("jobs"); };
  const saveProfileName = (name: string, account?: { active?: boolean }) => {
    const next = name.trim();
    if (!next) return;
    window.localStorage.setItem("usta-cepte-profile-name", next);
    setProfileName(next);
    if (account) {
      setAccountActive(Boolean(account.active));
      const nextRole = getInitialActiveRole(readStoredAccount());
      if (nextRole) {
        setActiveRole(nextRole);
        setTab(nextRole === "usta" ? "map" : "home");
        setOnboardingOpen(false);
      } else if (account.active) {
        setOnboardingOpen(true);
        setAccountOpen(false);
      }
    }
  };
  const selectRole = (role: ActiveRole, closeAccount = false) => {
    window.localStorage.setItem("usta-cepte-active-role", role);
    setActiveRole(role);
    setOnboardingOpen(false);
    setFlowOpen(false);
    setTrackingJob(null);
    setTab(role === "usta" ? "map" : "home");
    if (closeAccount) setAccountOpen(false);
  };
  const clearAccountStorage = () => {
    void supabaseSignOut();
    ["usta-cepte-profile-name", "usta-cepte-account", "usta-cepte-user-name", "usta-cepte-user-id", "usta-cepte-profile-photo", "usta-cepte-active-role", "deviceId"].forEach((key) => window.localStorage.removeItem(key));
    setProfileName("Misafir");
    setAccountActive(false);
    setActiveRole(null);
    setOnboardingOpen(false);
    setAccountOpen(false);
  };
  const deleteAccount = () => {
    if (!window.confirm("Hesabınızı bu cihazdan silmek istediğinize emin misiniz?")) return;
    clearAccountStorage();
  };

  return (
    <div style={{ ...vars, width: "100%", height: "100%", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
        .appdemo-wrap * { box-sizing: border-box; }
        .appdemo-wrap button { font-family: inherit; cursor: pointer; }
        .appdemo-wrap a { text-decoration: none; }
        .appdemo-wrap input, .appdemo-wrap textarea { font-family: inherit; }
        .appdemo-wrap ::placeholder { color: var(--muted); }
        .appdemo-wrap input:focus, .appdemo-wrap textarea:focus { outline: 2px solid var(--teal); outline-offset: 1px; }
        @keyframes appdemo-pulseRing { 0% { transform: scale(0.7); opacity: 0.6; } 100% { transform: scale(2.1); opacity: 0; } }
        @keyframes appdemo-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
      <div className="appdemo-wrap" style={{ width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden" }}>
        <div className="screen-transition" key={nearbyOpen ? "nearby-masters" : onboardingOpen ? "role-onboarding" : trackingJob ? `tracking-${trackingJob.id}` : flowOpen ? "request-flow" : `${activeRole ?? "guest"}-${tab}`}>
          {nearbyOpen ? (
              <NearbyMastersScreen onClose={() => { setNearbyOpen(false); setNearbyLocation(null); }} requestedLocation={nearbyLocation} onStartRequest={() => { setNearbyOpen(false); startFlow(null); }} />
          ) : onboardingOpen ? (
            <RoleOnboarding onSelect={(role) => selectRole(role, true)} />
          ) : trackingJob ? (
              <TrackingScreen job={trackingJob} onClose={() => setTrackingJob(null)} isProvider={activeRole === "usta"} onAction={handleJobAction} />
          ) : flowOpen ? (
            <RequestFlow initialCat={flowCat} onClose={() => setFlowOpen(false)} onSubmit={handleSubmit} />
          ) : (
            <>
              {((!accountActive && tab === "home") || (activeRole === "customer" && tab === "home")) && <HomeScreen onStart={startFlow} jobs={jobs} onOpenJob={openJob} isAuthenticated={accountActive} onOpenAccount={() => setAccountOpen(true)} onOpenNearby={() => { setAccountOpen(false); setTrackingJob(null); setFlowOpen(false); openNearby(); }} onOpenRegistration={(panel) => { window.location.href = appPath(`kayit?panel=${panel}`); }} />}
               {tab === "jobs" && <JobsScreen jobs={jobs} onStart={startFlow} onTrack={setTrackingJob} isProvider={activeRole === "usta"} onAction={handleJobAction} />}
              {activeRole === "usta" && tab === "map" && <MapTab />}
              {tab === "notifications" && <NotificationsScreen jobs={jobs} onStart={activeRole === "usta" ? () => setTab("map") : () => startFlow(null)} isProvider={activeRole === "usta"} />}
            </>
          )}
        </div>
        <div className="appdemo-fixed-nav" style={s.bottomNav}>
          <NavBtn icon={activeRole === "usta" ? MapIcon : HomeIcon} label={activeRole === "usta" ? "İş Fırsatları / Harita" : "Keşfet"} active={(activeRole === "usta" ? tab === "map" : tab === "home") && !trackingJob && !flowOpen} onClick={() => { setAccountOpen(false); setTrackingJob(null); setFlowOpen(false); setTab(activeRole === "usta" ? "map" : "home"); }} />
          {activeRole === "usta" ? (
            <NavBtn icon={Briefcase} label="Tekliflerim" active={tab === "jobs" && !trackingJob && !flowOpen} onClick={() => { setAccountOpen(false); setTrackingJob(null); setFlowOpen(false); setTab("jobs"); }} />
          ) : (
            <NavBtn icon={Briefcase} label="Taleplerim" active={tab === "jobs" && !trackingJob && !flowOpen} onClick={() => { setAccountOpen(false); setTrackingJob(null); setFlowOpen(false); setTab("jobs"); }} />
          )}
          {activeRole === "usta" ? (
            <button type="button" className="usta-nav-action" data-testid="button-open-provider-map" style={s.fab} onClick={() => { setTrackingJob(null); setFlowOpen(false); setTab("map"); }} aria-label="Haritayı Aç">
              <MapIcon size={21} color="#FFF" strokeWidth={2.2} />
            </button>
          ) : (
            <button type="button" data-testid="button-create-request-nav" style={s.fab} onClick={() => { setTrackingJob(null); startFlow(null); }} aria-label="Talep Oluştur">
              <Plus size={22} color="#FFF" strokeWidth={2.5} />
            </button>
          )}
          <NavBtn icon={Bell} label="Bildirimler" active={tab === "notifications" && !trackingJob && !flowOpen} onClick={() => { setAccountOpen(false); setTrackingJob(null); setFlowOpen(false); setTab("notifications"); }} />
          <NavBtn icon={User} label="Hesabım" active={accountOpen} onClick={() => { setTrackingJob(null); setFlowOpen(false); setAccountOpen(true); }} />
        </div>
        {accountOpen && (
          <AccountModal
            name={profileName}
            activeRole={activeRole ?? "customer"}
            onClose={() => setAccountOpen(false)}
            onSave={saveProfileName}
            onSelectRole={(role) => selectRole(role, true)}
             onBecomeProvider={() => { window.location.href = appPath("kayit?panel=usta-kayit"); }}
             onOpenProviderRegistration={(panel) => { window.location.href = appPath(`kayit?panel=${panel}`); }}
            onOpenNotifications={() => { setAccountOpen(false); setTrackingJob(null); setFlowOpen(false); setTab("notifications"); }}
             jobs={jobs}
            onSignOut={clearAccountStorage}
            onDelete={deleteAccount}
          />
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  screen: { minHeight: "100%", paddingBottom: 10 },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 12px" },
  accountButton: { display: "flex", alignItems: "center", gap: 5, width: 78, justifyContent: "center", padding: "8px 5px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", color: "var(--navy)", fontSize: 10, fontWeight: 800 },
  accountOverlay: { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(16,27,40,.48)" },
  accountModal: { position: "relative", width: "min(100%, 360px)", display: "flex", flexDirection: "column", alignItems: "stretch", padding: 24, borderRadius: 20, background: "var(--surface)", boxShadow: "0 20px 60px rgba(16,27,40,.25)" },
  accountClose: { alignSelf: "flex-end", display: "grid", placeItems: "center", width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 99, background: "var(--surface2)" },
  accountAvatar: { alignSelf: "center", display: "grid", placeItems: "center", width: 60, height: 60, borderRadius: 30, background: "#E7F3F0" },
  accountAvatarImage: { width: "100%", height: "100%", borderRadius: 30, objectFit: "cover" } as any,
  accountPhotoInput: { position: "absolute", width: 1, height: 1, opacity: 0 } as any,
  visuallyHidden: { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 } as any,
  accountTitle: { margin: "12px 0 2px", color: "var(--navy)", fontSize: 21, textAlign: "center" },
  accountHint: { color: "var(--muted)", fontSize: 12, textAlign: "center" },
  accountProfileCard: { display: "flex", alignItems: "center", gap: 10, marginTop: 18, padding: 12, border: "1px solid #F0D7A6", borderRadius: 12, background: "#FFF8E8" },
  accountProfileBadge: { display: "grid", placeItems: "center", width: 42, height: 42, flexShrink: 0, borderRadius: 21, color: "#FFF", background: "var(--copper)", fontSize: 18, fontWeight: 800 },
  accountProfileName: { display: "block", overflow: "hidden", color: "var(--navy)", fontSize: 13, textOverflow: "ellipsis", whiteSpace: "nowrap" },
  accountProfileRole: { display: "block", marginTop: 3, color: "var(--copper)", fontSize: 11, fontWeight: 700 },
  accountProfileMeta: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 3, color: "var(--muted)", fontSize: 11 },
  verifiedBadge: { display: "inline-flex", alignItems: "center", gap: 3, color: "var(--teal)", fontWeight: 800 },
  accountGuest: { paddingTop: 14 },
  accountGuestText: { margin: "0 0 12px", color: "var(--muted)", fontSize: 12, lineHeight: 1.45, textAlign: "center" },
  accountLogin: { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "12px 14px", border: "none", borderRadius: 11, color: "#FFF", background: "var(--copper)", fontWeight: 800 },
  accountLoginError: { marginTop: 8, padding: "8px 10px", borderRadius: 8, color: "#9D2C2C", background: "#FFF1F1", fontSize: 11, lineHeight: 1.4 },
  accountRegisterLink: { marginTop: 8, padding: "8px 10px", border: "none", color: "var(--teal)", background: "transparent", fontSize: 12, fontWeight: 700 },
  accountMenu: { display: "flex", flexDirection: "column", alignItems: "stretch", paddingTop: 8 },
  accountMenuItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", border: "none", color: "var(--text)", background: "transparent", fontSize: 12, fontWeight: 700, textAlign: "left" },
  accountRoleChange: { padding: "3px 7px", borderRadius: 6, color: "#9A6200", background: "#FFF0C9", fontSize: 10, fontWeight: 800 },
  accountLabel: { marginTop: 18, marginBottom: 6, color: "var(--navy)", fontSize: 12, fontWeight: 700 },
  accountInput: { height: 44, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", background: "var(--bg)", fontSize: 13 },
  accountSave: { marginTop: 10, padding: "12px 14px", border: "none", borderRadius: 11, color: "#FFF", background: "var(--teal)", fontWeight: 800 },
  accountDivider: { height: 1, margin: "18px 0 8px", background: "var(--border)" },
  accountAction: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", border: "none", color: "var(--text)", background: "transparent", fontSize: 12, fontWeight: 700 },
  accountActionSpan: { display: "flex", alignItems: "center", gap: 7 },
  accountDelete: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", border: "none", color: "var(--destructive)", background: "transparent", fontSize: 12, fontWeight: 700 },
  accountDeleteSpan: { display: "flex", alignItems: "center", gap: 7 },
  accountInfoMessage: { marginTop: 8, padding: "9px 10px", borderRadius: 9, color: "var(--muted)", background: "var(--surface2)", fontSize: 11, lineHeight: 1.45 },
  accountCancel: { marginTop: 5, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10, color: "var(--muted)", background: "var(--surface)" },
  locationButton: { position: "relative", display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "5px 9px 5px 5px", border: "1px solid var(--border)", borderRadius: 14, background: "rgba(255,255,255,.72)", color: "inherit", textAlign: "left", cursor: "pointer" },
  locWrap: { display: "flex", alignItems: "center", gap: 8 },
  locPin: { width: 24, height: 24, borderRadius: 8, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  locKicker: { fontSize: 9.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1 } as any,
  locLabel: { fontSize: 14, color: "var(--text)", fontWeight: 700, marginTop: 3, maxWidth: 205, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  locationPopover: { position: "absolute", zIndex: 20, top: 62, left: 14, right: 14, padding: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 10px 26px rgba(27,36,48,0.16)" },
  locationPopoverHead: { display: "flex", alignItems: "center", gap: 6, color: "var(--navy)", fontSize: 12, fontWeight: 800, marginBottom: 9 },
  locationMapFrame: { height: 150, overflow: "hidden", borderRadius: 10, border: "1px solid var(--border)" },
  locationMapIframe: { display: "block", width: "100%", height: "calc(100% + 24px)", transform: "translateY(0)", border: 0 },
  locationPopoverAddress: { marginTop: 9, color: "var(--text)", fontSize: 12.5, fontWeight: 700, lineHeight: 1.35 },
  locationPopoverCoords: { marginTop: 3, color: "var(--muted)", fontSize: 10.5 },
  topTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16.5 },
  iconBtn: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 1px 2px rgba(27,36,48,0.05)" },
  dot: { position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 99, background: "var(--copper)", border: "1.5px solid var(--surface)" },
  hero: { padding: "10px 20px 22px", position: "relative", overflow: "hidden" },
  heroImage: { width: "100%", height: 150, objectFit: "cover", objectPosition: "center 58%", borderRadius: 18, marginBottom: 16, display: "block", filter: "saturate(0.92)" } as any,
  heroGrid: { position: "absolute", inset: 0, opacity: 0.5, backgroundImage: "linear-gradient(rgba(27,42,60,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(27,42,60,0.06) 1px, transparent 1px)", backgroundSize: "22px 22px", maskImage: "linear-gradient(to bottom, black, transparent 85%)", WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)" } as any,
  heroEyebrow: { position: "relative", display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, letterSpacing: 0.8, color: "var(--copper)", fontWeight: 700, marginBottom: 12 },
  heroTitle: { position: "relative", fontFamily: "'Space Grotesk', sans-serif", fontSize: 31, lineHeight: 1.14, fontWeight: 700, margin: "0 0 10px", color: "var(--navy)" },
  heroSub: { position: "relative", fontSize: 14, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 20px", maxWidth: 320 },
  heroCta: { position: "relative", display: "flex", alignItems: "center", gap: 8, background: "var(--copper)", color: "#FFF", border: "none", padding: "14px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14.5, boxShadow: "0 6px 16px rgba(220,122,46,0.32)" },
  quickRegistrationSection: { position: "relative", paddingTop: 12 },
  quickRegistrationLabel: { marginBottom: 7, color: "var(--muted)", fontSize: 10, fontWeight: 800, letterSpacing: .5, textTransform: "uppercase" },
  quickRegistrationGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 7 },
  quickRegistrationCard: { minWidth: 0, display: "flex", alignItems: "center", gap: 6, padding: "9px 7px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", textAlign: "left" },
  quickRegistrationIcon: { display: "grid", placeItems: "center", width: 30, height: 30, flexShrink: 0, borderRadius: 9 },
  quickRegistrationTitle: { display: "block", color: "var(--navy)", fontSize: 11.5, lineHeight: 1.2 },
  quickRegistrationText: { display: "block", marginTop: 2, color: "var(--muted)", fontSize: 9.5, lineHeight: 1.2 },
  accountEntryCard: { position: "relative", display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 9, padding: 11, border: "1px solid var(--border)", borderRadius: 13, background: "var(--surface)", color: "var(--text)", textAlign: "left" },
  accountEntryIcon: { display: "grid", placeItems: "center", width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: "#E7F3F0" },
  accountEntryTitle: { display: "block", color: "var(--navy)", fontSize: 12, lineHeight: 1.25 },
  accountEntryText: { display: "block", marginTop: 3, color: "var(--muted)", fontSize: 10.5, lineHeight: 1.3 },
  sectionPad: { padding: "14px 20px" },
  customerNoticeSection: { padding: "4px 20px 8px", display: "flex", flexDirection: "column", gap: 9 },
  customerNotice: { display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" },
  customerNoticeIcon: { width: 36, height: 36, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: 12, fontSize: 17, fontWeight: 800 },
  customerNoticeTitle: { display: "block", color: "var(--navy)", fontSize: 13, fontWeight: 800 },
  customerNoticeText: { display: "block", marginTop: 2, color: "var(--muted)", fontSize: 11, lineHeight: 1.35 },
  featuredSection: { padding: "8px 20px 14px" },
  featuredHeading: { color: "var(--navy)", fontSize: 17, fontWeight: 800 },
  featuredGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 },
  featuredCard: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0, padding: 11, border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)" },
  featuredAvatar: { width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 18, background: "#E7F3F0" },
  featuredName: { overflow: "hidden", color: "var(--navy)", fontSize: 12, textOverflow: "ellipsis", whiteSpace: "nowrap" },
  featuredSpecialty: { overflow: "hidden", color: "var(--muted)", fontSize: 10, textOverflow: "ellipsis", whiteSpace: "nowrap" },
  featuredRating: { display: "flex", alignItems: "center", gap: 3, color: "var(--text)", fontSize: 10, whiteSpace: "nowrap" },
  featuredStatus: { alignSelf: "flex-start", padding: "4px 7px", borderRadius: 99, color: "var(--teal)", background: "#E7F3F0", fontSize: 9, fontWeight: 800 },
  profileOverlay: { position: "fixed", inset: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(16,27,40,.48)" },
  profileModal: { position: "relative", width: "min(100%, 360px)", display: "flex", flexDirection: "column", alignItems: "center", padding: 24, borderRadius: 22, background: "var(--surface)", boxShadow: "0 20px 60px rgba(16,27,40,.25)", textAlign: "center" },
  profileClose: { position: "absolute", top: 12, right: 12, display: "grid", placeItems: "center", width: 32, height: 32, border: "1px solid var(--border)", borderRadius: 99, background: "var(--surface2)" },
  profileAvatarLarge: { display: "grid", placeItems: "center", width: 68, height: 68, borderRadius: 34, background: "#E7F3F0" },
  profileVerified: { display: "flex", alignItems: "center", gap: 5, marginTop: 14, color: "var(--copper)", fontSize: 10, fontWeight: 800, letterSpacing: .4 },
  profileName: { margin: "7px 0 2px", color: "var(--navy)", fontSize: 22, fontWeight: 800 },
  profileService: { color: "var(--muted)", fontSize: 13 },
  profileRatingLarge: { display: "flex", alignItems: "center", gap: 5, marginTop: 14, color: "var(--text)", fontSize: 13 },
  profileRatingLargeSpan: { color: "var(--muted)", fontSize: 11 },
  profileStatus: { marginTop: 12, padding: "6px 10px", borderRadius: 99, color: "var(--teal)", background: "#E7F3F0", fontSize: 10, fontWeight: 800 },
  profileCta: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 20, padding: "12px 16px", borderRadius: 12, border: "none", color: "#FFF", background: "var(--copper)", fontWeight: 800 },
  sectionLabel: { fontSize: 12, color: "var(--muted)", fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 } as any,
  catGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9, marginBottom: 20 },
  catTile: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 4px 12px", boxShadow: "0 1px 2px rgba(27,36,48,0.04)" },
  catTileActive: { borderColor: "var(--navy)", background: "var(--surface2)" },
  catPhoto: { width: "100%", height: 96, display: "flex", alignItems: "flex-end", justifyContent: "flex-start", padding: 10, backgroundPosition: "center", backgroundSize: "cover", backgroundColor: "var(--surface2)" },
  catIconWrap: { width: 34, height: 34, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" },
  catIconWrapActive: { background: "var(--navy)" },
  catCheck: { position: "absolute", top: 6, right: 6, width: 15, height: 15, borderRadius: 99, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 10.5, textAlign: "center", lineHeight: 1.25 },
  activeCard: { width: "100%", display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 14, textAlign: "left", boxShadow: "0 2px 8px rgba(27,36,48,0.06)" },
  pulseWrap: { position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pulseRing: { position: "absolute", width: 36, height: 36, borderRadius: 99, border: "2px solid var(--teal)", animation: "appdemo-pulseRing 1.8s ease-out infinite" },
  pulseCore: { width: 13, height: 13, borderRadius: 99, background: "var(--teal)" },
  activeTitle: { fontWeight: 700, fontSize: 14.5, color: "var(--navy)" },
  activeSub: { fontSize: 12.5, fontWeight: 600, marginTop: 3 },
  activeArrow: { width: 30, height: 30, borderRadius: 99, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  howCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 16px 4px", boxShadow: "0 1px 2px rgba(27,36,48,0.04)" },
  registrationCards: { display: "flex", flexDirection: "column", gap: 10 },
  registrationCard: { width: "100%", display: "flex", alignItems: "center", gap: 11, padding: 13, border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", boxShadow: "0 1px 4px rgba(27,36,48,0.05)" },
  registrationCardIcon: { display: "grid", placeItems: "center", width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: "var(--surface2)" },
  registrationCardTitle: { display: "block", color: "var(--navy)", fontSize: 13.5, fontWeight: 800 },
  registrationCardDesc: { display: "block", marginTop: 2, color: "var(--muted)", fontSize: 11.5, lineHeight: 1.35 },
  stepsCol: { display: "flex", flexDirection: "column" },
  stepRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  stepNumCol: { display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 },
  stepNum: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "var(--navy)", fontSize: 12.5, background: "var(--surface2)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" },
  stepLine: { width: 2, flex: 1, background: "var(--border)", marginTop: 4, minHeight: 16 },
  stepTitle: { fontWeight: 700, fontSize: 13.5, color: "var(--text)" },
  stepDesc: { fontSize: 12, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 },
  progressWrap: { display: "flex", gap: 8, padding: "0 20px 16px" },
  progressBar: { height: 4, borderRadius: 99, marginBottom: 7 },
  progressLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 0.2 },
  flowBody: { padding: "4px 20px 170px" },
  qTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 19, margin: "4px 0 16px", color: "var(--navy)" },
  fieldLabel: { fontSize: 11, letterSpacing: 0.6, color: "var(--muted)", fontWeight: 700, margin: "4px 0 8px", textTransform: "uppercase" } as any,
  field: { marginBottom: 12 },
  fieldSub: { fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 5, fontWeight: 600 },
  input: { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 13px", color: "var(--text)", fontSize: 14.5, boxShadow: "0 1px 2px rgba(27,36,48,0.03)" },
  inputWithIcon: { display: "flex", alignItems: "center", gap: 9, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 13px", boxShadow: "0 1px 2px rgba(27,36,48,0.03)" },
  inputBare: { flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--text)", fontSize: 14.5, padding: 0 },
  textarea: { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 13px", color: "var(--text)", fontSize: 14.5, resize: "none", boxShadow: "0 1px 2px rgba(27,36,48,0.03)" } as any,
  priorityBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 6px", color: "var(--text)", textAlign: "center" } as any,
  choiceRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  choiceBtn: { padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 12, fontWeight: 600 },
  choiceBtnActive: { borderColor: "var(--teal)", background: "#E7F3F0", color: "var(--teal)", fontWeight: 800 },
  slotBtn: { display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", color: "var(--text)", fontSize: 13.5, textAlign: "left", fontWeight: 500, width: "100%" } as any,
  slotBtnActive: { borderColor: "var(--teal)", background: "#E7F3F0", color: "var(--teal)", fontWeight: 700 },
  photoBtn: { display: "flex", alignItems: "center", gap: 9, background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 12, padding: "13px", fontSize: 13, width: "100%" },
  photoBtnActive: { borderStyle: "solid", borderColor: "var(--teal)", background: "#E7F3F0" } as any,
  reviewCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "4px 14px", marginBottom: 14, boxShadow: "0 1px 2px rgba(27,36,48,0.04)" },
  reviewCardHead: { display: "flex", justifyContent: "space-between", padding: "12px 0 10px", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: "var(--muted)", borderBottom: "1px solid var(--border)" },
  reviewRow: { display: "flex", justifyContent: "space-between", padding: "11px 0", gap: 10 },
  reviewLabel: { fontSize: 12.5, color: "var(--muted)", fontWeight: 600 },
  reviewValue: { fontSize: 13, fontWeight: 700, textAlign: "right", color: "var(--navy)" },
  trustRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", background: "var(--surface2)", borderRadius: 12, padding: "10px 12px" },
  flowFooter: { position: "sticky", bottom: 88, zIndex: 20, padding: "16px 16px 12px", background: "linear-gradient(to top, var(--bg) 72%, transparent)" },
  submitBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--copper)", color: "#FFF", border: "none", padding: "15px", borderRadius: 14, fontWeight: 700, fontSize: 14.5, boxShadow: "0 6px 16px rgba(220,122,46,0.3)" },
  callBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "var(--navy)", color: "#FFF", border: "none", padding: "15px 18px", borderRadius: 14, fontWeight: 700, fontSize: 13.5 },
  callBtnSmall: { display: "flex", alignItems: "center", gap: 5, background: "var(--navy)", color: "#FFF", border: "none", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 11.5 },
  liveLocCard: { display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 1px 2px rgba(27,36,48,0.04)" },
  liveLocPulse: { position: "relative", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  liveLocPulseRing: { position: "absolute", width: 26, height: 26, borderRadius: 99, border: "2px solid var(--teal)", animation: "appdemo-pulseRing 1.8s ease-out infinite" },
  liveLocPulseCore: { width: 9, height: 9, borderRadius: 99, background: "var(--teal)" },
  liveLocTitle: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--teal)" },
  liveLocAddr: { fontSize: 12.5, fontWeight: 600, color: "var(--navy)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as any,
  liveLocCoords: { fontSize: 10.5, color: "var(--muted)", marginTop: 2 },
  searchWrap: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "30px 24px 40px", gap: 6 } as any,
  callingWrap: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 20px 30px", gap: 6 } as any,
  radarWrap: { position: "relative", width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  radarRing1: { position: "absolute", inset: 0, border: "2px solid var(--teal)", borderRadius: 99, animation: "appdemo-pulseRing 2s ease-out infinite" },
  radarRing2: { position: "absolute", inset: 0, border: "2px solid var(--teal)", borderRadius: 99, animation: "appdemo-pulseRing 2s ease-out infinite 1s" },
  radarCore: { width: 46, height: 46, borderRadius: 99, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" },
  searchTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 17.5, fontWeight: 700, maxWidth: 300, color: "var(--navy)" },
  searchSub: { fontSize: 12.5, color: "var(--muted)", marginTop: 4, marginBottom: 6 },
  callList: { display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 16 },
  callRow: { display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", textAlign: "left" } as any,
  callingTag: { display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: "var(--copper)", flexShrink: 0 },
  callingDot: { width: 6, height: 6, borderRadius: 99, background: "var(--copper)", animation: "appdemo-blink 1s ease-in-out infinite" },
  matchBadge: { width: 56, height: 56, borderRadius: 99, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  matchCard: { display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, width: "100%", margin: "16px 0", boxShadow: "0 2px 8px rgba(27,36,48,0.05)" },
  matchAvatar: { width: 42, height: 42, borderRadius: 99, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, color: "#FFF", flexShrink: 0 },
  matchMeta: { fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 3, marginTop: 3 },
  verifiedTag: { display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "var(--teal)", background: "#E7F3F0", padding: "5px 8px", borderRadius: 99, flexShrink: 0 },
  departCard: { width: "100%", background: "var(--surface2)", borderRadius: 14, padding: "2px 14px", marginBottom: 16 },
  jobCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, boxShadow: "0 1px 2px rgba(27,36,48,0.04)" },
  jobCardClickable: { cursor: "pointer", borderColor: "rgba(15,122,99,.28)", boxShadow: "0 5px 16px rgba(15,122,99,.10)" },
  trackingInfoCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 14, boxShadow: "0 4px 14px rgba(27,36,48,.06)" },
  trackingDetails: { marginTop: 14, padding: "2px 12px", borderRadius: 12, background: "var(--surface2)" },
  phoneUnavailable: { color: "var(--muted)", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" },
  disabledCall: { pointerEvents: "none", opacity: 0.55, background: "var(--muted)" },
  jobLoc: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)", marginTop: 5 },
  jobFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" },
  trackBtn: { flex: 1, background: "var(--teal)", color: "#FFF", border: "none", borderRadius: 10, padding: "8px 13px", fontWeight: 700, fontSize: 11.5 },
  badge: { fontSize: 10.5, fontWeight: 700, padding: "5px 10px", borderRadius: 99, color: "#FFF", flexShrink: 0 },
  emptyCard: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 16, padding: "28px 20px" } as any,
  emptyIconWrap: { width: 42, height: 42, borderRadius: 12, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontWeight: 700, fontSize: 14.5, color: "var(--navy)" },
  emptyDesc: { fontSize: 12.5, color: "var(--muted)", marginTop: 5, maxWidth: 240, lineHeight: 1.5 },
  emptyCta: { marginTop: 16, display: "flex", alignItems: "center", gap: 6, background: "var(--copper)", color: "#FFF", border: "none", padding: "10px 16px", borderRadius: 12, fontWeight: 700, fontSize: 12.5 },
  mapArea: { position: "relative", margin: "0 20px 6px", height: 260, borderRadius: 18, overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" },
  tileMap: { position: "absolute", inset: 0, overflow: "hidden", background: "#DDE8E8" },
  tileCanvas: { position: "absolute" },
  tileRoute: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" },
  mapVehiclePin: { position: "absolute", width: 42, height: 42, borderRadius: 21, background: "var(--teal)", border: "4px solid #FFF", boxShadow: "0 4px 14px rgba(8,127,115,.35)", display: "grid", placeItems: "center", zIndex: 3, transition: "left 1.4s ease, top 1.4s ease" },
  mapCustomerPin: { position: "absolute", width: 34, height: 34, borderRadius: 17, background: "var(--navy)", border: "4px solid #FFF", boxShadow: "0 4px 12px rgba(23,50,77,.28)", display: "grid", placeItems: "center", zIndex: 3 },
  tileMapControls: { position: "absolute", right: 12, top: 12, display: "flex", flexDirection: "column", gap: 1, background: "#FFF", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.18)", zIndex: 4 },
  tileMapControl: { width: 38, height: 38, border: 0, background: "#FFF", color: "var(--navy)", fontSize: 24, lineHeight: 1, cursor: "pointer" },
  tileMapLegend: { position: "absolute", left: 12, bottom: 26, display: "flex", gap: 8, padding: "7px 10px", borderRadius: 9, background: "rgba(255,255,255,.94)", boxShadow: "0 2px 8px rgba(0,0,0,.14)", fontSize: 10.5, fontWeight: 700, color: "var(--navy)", zIndex: 4 },
  legendDot: { width: 8, height: 8, display: "inline-block", borderRadius: "50%", marginRight: 4 },
  tileMapAttribution: { position: "absolute", right: 8, bottom: 5, fontSize: 9, color: "#4E5C62", textShadow: "0 1px 2px #FFF", zIndex: 4 },
  mapFrame: { position: "absolute", inset: 0, overflow: "hidden" },
  // The OSM embed is cross-origin, so its attribution cannot be styled from
  // the parent document. Extending the iframe below the clipped map keeps
  // that footer from covering the visible tracking surface.
  mapFrameIframe: { position: "absolute", top: 0, left: 0, width: "100%", height: "calc(100% + 28px)", border: 0 },
  mapGrid: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(27,42,60,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(27,42,60,0.07) 1px, transparent 1px)", backgroundSize: "18px 18px" },
  pin: { position: "absolute", width: 26, height: 26, borderRadius: "50% 50% 50% 0", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #FFF", boxShadow: "0 2px 6px rgba(27,36,48,0.25)", transform: "translate(-50%,-50%) rotate(45deg)" },
  mapBadge: { position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, background: "#FFF", border: "1px solid var(--border)", borderRadius: 99, padding: "7px 12px", fontSize: 11.5, fontWeight: 700, boxShadow: "0 2px 6px rgba(27,36,48,0.08)" },
  masterCard: { width: "100%", display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 12, textAlign: "left", boxShadow: "0 1px 2px rgba(27,36,48,0.04)" } as any,
  masterCardActive: { borderColor: "var(--navy)", background: "var(--surface2)" },
  statusPill: { fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 99, marginTop: 4, display: "inline-block" },
  bottomNav: { position: "fixed", left: "50%", bottom: 0, zIndex: 30, transform: "translateX(-50%)", width: "min(100%, 1100px)", height: 76, background: "rgba(246,243,236,0.96)", backdropFilter: "blur(10px)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 10px calc(0px + env(safe-area-inset-bottom))", boxShadow: "0 -8px 24px rgba(27,36,48,.06)" } as any,
  page: { minHeight: "100%", paddingBottom: 90 },
  pageTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, fontWeight: 700, color: "var(--navy)" },
  pageSubtitle: { fontSize: 12, color: "var(--muted)", marginTop: 3 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8, background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 16, padding: "32px 20px", color: "var(--muted)" } as any,
  notificationCard: { display: "flex", alignItems: "flex-start", gap: 11, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 13, marginBottom: 9 } as any,
  notificationIcon: { width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "#E7F3F0", flexShrink: 0 },
  navBtn: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", width: 56, padding: "6px 0" },
  navDot: { position: "absolute", top: -8, width: 4, height: 4, borderRadius: 99, background: "var(--copper)" },
  fab: { width: 54, height: 54, borderRadius: 17, background: "var(--navy)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -24, boxShadow: "0 8px 20px rgba(27,42,60,0.35)" },
};
