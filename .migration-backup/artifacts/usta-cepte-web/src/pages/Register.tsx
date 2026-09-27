import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Wrench, Truck, Building2, CheckCircle2, Bell, Camera, User, X } from "lucide-react";
import { ANTALYA_DISTRICTS } from "@/data/antalya";
import { registerWithSupabase } from "@/lib/supabase";
import { appPath } from "@/lib/navigation";

const TEAL = "#00C8B3";

const DISTRICTS = Object.keys(ANTALYA_DISTRICTS);

const USTA_CATEGORIES = [
  "Elektrik", "Su Tesisatı", "Klima", "Boya ve Badana Hizmetleri", "Dekoratif Sıva Hizmetleri", "Duvar Kağıdı Hizmetleri", "Seramik",
  "Anahtar & Çilingir", "Isı Yalıtımı", "Ev Temizliği",
  "Kaynak İşleri", "Şap ve Saha Beton Hizmetleri", "Mobilya Montaj ve Tamir Hizmetleri", "Alçı ve Alçıpan Hizmetleri", "Söve Uygulama", "Çatı İşleri", "Sundurma İşleri", "Halı Yıkama Hizmetleri", "Diğer",
];

const VEHICLE_TYPES = [
  "Kamyonet", "Kamyon (5–10 Ton)", "Kamyon (10–20 Ton)",
  "Asansörlü araç", "Minivan / Panelvan", "Pikap", "TIR (20+ Ton)",
];
const LICENSE_CLASSES = ["B", "C", "CE", "D", "DE", "B + C", "Diğer"];
const CLEANING_TEAM_SIZES = ["1 kişilik ekip", "2 kişilik ekip", "3 kişilik ekip"];

// ─── KVKK metni (müşteri için kısa, diğerleri için ücret bilgili uzun) ─────
const KVKK_SHORT = `Kişisel verilerimin 6698 sayılı KVKK kapsamında işlenmesine onay veriyorum.`;

const KVKK_PAID = `Usta Cepte platformuna dahil olacak profesyonel üyeler için aylık 3.000 ₺ yazılım ve uygulama kullanım ücreti uygulanır. Ücret, başvurunun onaylanması ve hizmetin aktif edilmesiyle başlayan her aylık dönem için tahakkuk eder.

Platform yalnızca hizmet veren ile müşteriyi buluşturan bir aracıdır; işin kalitesi, fiyatı, süresi, gerekli izinler, vergi yükümlülükleri, çalışanlar ve müşteriye karşı doğan tüm mesleki/operasyonel sorumluluk hizmet verene aittir. Platformun kayıt veya görünürlük sağlaması iş garantisi, gelir garantisi ya da müşteri memnuniyeti taahhüdü değildir. Geciken ödemelerde hesabın görünürlüğü ve erişimi durdurulabilir; iptal ve iade koşulları ayrıca yazılı hizmet sözleşmesinde belirlenir.

Kişisel verilerimin ve işletme bilgilerimin 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ile Usta Cepte Gizlilik Politikası kapsamında; kimlik doğrulama, ödeme takibi, hizmet eşleştirme ve platform güvenliği amacıyla işlenmesine, gerekli durumlarda yetkili kişi ve kuruluşlarla paylaşılmasına açık rıza veriyorum.

Bu metni ve ücret bilgisini okudum, anladım ve başvuru şartlarını kabul ediyorum.`;

// ─── Şemalar ────────────────────────────────────────────────────────────────
const customerSchema = z.object({
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  phone: z.string().min(10, "Geçerli bir telefon numarası girin"),
  email: z.string().min(1, "E-posta zorunludur"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  district: z.string().min(1, "İlçe seçimi zorunludur"),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  kvkkConsent: z.boolean().refine((v) => v, "KVKK metnini onaylamalısınız"),
});

const ustaSchema = z.object({
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  phone: z.string().min(10, "Geçerli bir telefon numarası girin"),
  email: z.string().min(1, "E-posta zorunludur"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  idNumber: z.string().length(11, "TC Kimlik No 11 haneli olmalıdır"),
  specialty: z.string().optional(),
  specialties: z.array(z.string()).min(1, "En az bir branş seçin"),
  experience: z.coerce.number().min(0).max(50),
  district: z.string().optional(),
  serviceAreas: z.array(z.string()).min(1, "En az bir hizmet bölgesi seçin"),
  about: z.string().optional(),
  teamSize: z.string().optional(),
  kvkkConsent: z.boolean().refine((v) => v, "KVKK ve ücret koşullarını onaylamalısınız"),
});

const siteSchema = z.object({
  name: z.string().min(2, "Yetkili adı zorunludur"),
  email: z.string().min(1, "E-posta zorunludur"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  siteName: z.string().min(2, "Site / Bina adı zorunludur"),
  siteAddress: z.string().min(5, "Adres zorunludur"),
  district: z.string().min(1, "İlçe seçimi zorunludur"),
  unitCount: z.coerce.number().min(1, "Daire sayısı en az 1 olmalıdır"),
  kvkkConsent: z.boolean().refine((v) => v, "KVKK ve ücret koşullarını onaylamalısınız"),
});

const nakliyeciSchema = z.object({
  name: z.string().min(2, "Ad Soyad zorunludur"),
  phone: z.string().min(10, "Geçerli bir telefon numarası girin"),
  email: z.string().min(1, "E-posta zorunludur"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  idNumber: z.string().length(11, "TC Kimlik No 11 haneli olmalıdır"),
  licenseNumber: z.string().min(5, "Ehliyet numarası zorunludur"),
  licenseClass: z.string().min(1, "Ehliyet sınıfını seçin"),
  vehicleType: z.string().optional(),
  vehicleTypes: z.array(z.string()).min(1, "En az bir araç/hizmet seçin").max(3, "En fazla 3 araç/hizmet seçebilirsiniz"),
  licensePlate: z.string().min(5, "Plaka zorunludur"),
  capacity: z.string().optional(),
  district: z.string().optional(),
  serviceAreas: z.array(z.string()).min(1, "En az bir hizmet bölgesi seçin"),
  experience: z.coerce.number().min(0).max(50),
  kvkkConsent: z.boolean().refine((v) => v, "KVKK ve ücret koşullarını onaylamalısınız"),
});

// ─── API yardımcıları (fetch doğrudan, codegen hook'u olmayan rotalar için) ──
async function readApiResponse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();
  if (!contentType.includes("application/json")) {
    throw new Error(response.ok ? "Sunucudan beklenmeyen yanıt alındı." : `Sunucu isteği reddetti (${response.status}).`);
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Sunucudan geçersiz JSON yanıtı alındı.");
  }
}

async function postRegister(path: string, body: object, deviceId?: string) {
  const role = path === "craftsman" ? "craftsman" : path === "nakliyeci" ? "nakliyeci" : path === "admin" ? "admin" : path === "site-yonetimi" ? "site" : "customer";
  return registerWithSupabase({ ...(body as any), role });
}

function saveRegisteredAccount(data: { name?: string; email?: string; phone?: string }, role: string) {
  let existing: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(localStorage.getItem("usta-cepte-account") ?? "null");
    if (parsed && typeof parsed === "object") existing = parsed;
  } catch {
    existing = {};
  }
  localStorage.setItem("usta-cepte-account", JSON.stringify({ ...existing, name: data.name ?? "", email: data.email ?? "", ...(data.phone ? { phone: data.phone } : {}), role, active: true }));
  localStorage.setItem("usta-cepte-active-role", role === "Müşteri" ? "customer" : "usta");
}

function AccountActions({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const [account, setAccount] = useState<{ name: string; email: string; role: string; active: boolean } | null>(() => {
    try { return JSON.parse(localStorage.getItem("usta-cepte-account") ?? "null"); } catch { return null; }
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account?.name ?? "");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [photo, setPhoto] = useState(() => localStorage.getItem("usta-cepte-profile-photo") ?? "");
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("usta-cepte-notification-preferences") ?? '{"requests":true,"offers":true,"system":true}') as { requests: boolean; offers: boolean; system: boolean }; } catch { return { requests: true, offers: true, system: true }; }
  });
  const update = () => {
    const next = name.trim();
    if (!next || !account) return;
    const updated = { ...account, name: next };
    localStorage.setItem("usta-cepte-account", JSON.stringify(updated));
    setAccount(updated);
    onActiveChange?.(true);
    setEditing(false);
  };
  const logout = () => {
    localStorage.removeItem("usta-cepte-account");
    localStorage.removeItem("usta-cepte-profile-name");
    localStorage.removeItem("usta-cepte-active-role");
    setAccount(null);
    onActiveChange?.(false);
  };
  const deleteAccount = () => {
    localStorage.removeItem("usta-cepte-account");
    localStorage.removeItem("usta-cepte-profile-name");
    localStorage.removeItem("usta-cepte-profile-photo");
    localStorage.removeItem("usta-cepte-active-role");
    setAccount(null);
    onActiveChange?.(false);
  };
  const uploadPhoto = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) return;
      localStorage.setItem("usta-cepte-profile-photo", value);
      setPhoto(value);
    };
    reader.readAsDataURL(file);
  };
  const updateNotification = (key: "requests" | "offers" | "system") => {
    const updated = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(updated);
    localStorage.setItem("usta-cepte-notification-preferences", JSON.stringify(updated));
  };
  return (
    <section className="account-actions-panel" aria-label="Aktif hesap işlemleri">
      {account?.active ? (
        <>
          <div className="register-account-profile">
            <div className="register-account-avatar">{photo ? <img src={photo} alt={`${account.name} profil fotoğrafı`} /> : <User size={25} />}</div>
            <div className="register-account-profile-copy"><strong>{account.name || "Profiliniz"}</strong><span>{account.role} · {account.email}</span></div>
            <button type="button" className="register-profile-open" onClick={() => setProfileOpen((value) => !value)}>{profileOpen ? "Kapat" : "Profilim"}</button>
          </div>
          {profileOpen && (
            <div className="register-profile-panel">
              <div className="register-profile-panel-head"><div><strong>Profil bilgileri</strong><span>Hesabınızın görünen bilgilerini yönetin.</span></div><button type="button" onClick={() => setProfileOpen(false)} aria-label="Profili kapat"><X size={16} /></button></div>
              <label className="register-photo-upload">
                <span className="register-photo-preview">{photo ? <img src={photo} alt="" /> : <Camera size={20} />}</span>
                <span><strong>Profil fotoğrafı</strong><small>JPG veya PNG, en fazla 5 MB</small></span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadPhoto(event.target.files?.[0])} />
                <span className="register-photo-button">Fotoğraf seç</span>
              </label>
              {editing ? (
                <div className="account-edit-row"><Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Ad Soyad" /><Button type="button" onClick={update}>Kaydet</Button></div>
              ) : <button type="button" className="register-profile-edit" onClick={() => setEditing(true)}>Ad soyadınızı düzenleyin</button>}
            </div>
          )}
          <div className="register-account-settings">
            <button type="button" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={17} /><span><strong>Bildirim ayarları</strong><small>Talep, teklif ve sistem bildirimlerini yönetin</small></span><span className="register-settings-arrow">›</span></button>
            {notificationsOpen && <div className="register-notification-options">
              {([["requests", "Talep güncellemeleri"], ["offers", "Usta ve fırsat bildirimleri"], ["system", "Sistem bildirimleri"]] as const).map(([key, label]) => <button type="button" key={key} onClick={() => updateNotification(key)}><span>{label}</span><span className={`register-toggle ${notificationPrefs[key] ? "is-on" : ""}`}><i /></span></button>)}
            </div>}
          </div>
          <div className="account-actions-buttons">
            <button type="button" className="membership-action-link account-logout-button" onClick={logout}>Çıkış Yap</button>
            <button type="button" className="membership-action-link danger account-delete-button" onClick={deleteAccount}>Hesabımı Sil</button>
          </div>
        </>
      ) : <div className="account-actions-heading"><strong>Hesabınız burada görünecek</strong><span>Kayıt olduktan sonra profilinizi ve üyeliğinizi buradan yönetin.</span></div>}
    </section>
  );
}

// ─── Başarı Ekranı ───────────────────────────────────────────────────────────
function SuccessScreen({ role, onBack }: { role: string; onBack: () => void }) {
  const messages: Record<string, string> = {
    customer: "Müşteri hesabınız oluşturuldu. Antalya'nın en iyi ustalarına hemen ulaşabilirsiniz.",
    usta: "Usta başvurunuz alındı. Belgeleriniz incelendikten sonra hesabınız onaylanacaktır.",
    site: "Site yönetimi kaydınız alındı. Ekibimiz belgelerinizi inceleyecektir.",
    nakliyeci: "Nakliyeci başvurunuz alındı. Belgeleriniz onaylandıktan sonra hesabınız aktive edilecektir.",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "48px 12px", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: `${TEAL}20`, border: `2px solid ${TEAL}40` }}>
        <CheckCircle2 size={40} style={{ color: TEAL }} />
      </div>
      <h2 style={{ color: "var(--navy)", fontSize: 24, fontWeight: 800 }}>Başvurunuz alındı</h2>
      <p style={{ color: "var(--muted)", maxWidth: 420, lineHeight: 1.6 }}>{messages[role]}</p>
      {role === "site" ? (
        <p style={{ color: "var(--teal)", maxWidth: 460, lineHeight: 1.55, fontSize: 14, fontWeight: 600 }}>
          Site veya apartmanınızın ortak alanları ve daireleri için usta ihtiyaçlarını bu panelden tek yerden oluşturup takip edebilirsiniz.
        </p>
      ) : role !== "customer" && (
        <p style={{ color: "var(--teal)", maxWidth: 460, lineHeight: 1.55, fontSize: 14, fontWeight: 600 }}>
          Bu hesapla siz de müşteri olarak hizmet talebi oluşturabilir, Antalya’daki hizmetlerden yararlanabilirsiniz.
        </p>
      )}
      {role === "customer" && (
        <Button
          onClick={() => { window.location.href = appPath("?account=1"); }}
          style={{ backgroundColor: TEAL, color: "#fff", padding: "11px 28px", borderRadius: 10 }}
        >
          Hesabımı aç ve uygulamaya geç
        </Button>
      )}
      {role === "site" ? (
        <Button
          onClick={() => { window.location.href = appPath(); }}
          style={{ backgroundColor: TEAL, color: "#fff", padding: "11px 28px", borderRadius: 10 }}
        >
          Usta ihtiyaçlarını gör
        </Button>
      ) : role !== "customer" && (
        <Button
          onClick={() => { window.location.href = appPath(); }}
          style={{ backgroundColor: TEAL, color: "#fff", padding: "11px 28px", borderRadius: 10 }}
        >
          Müşteri olarak hizmet al
        </Button>
      )}
      <Button onClick={onBack} style={{ backgroundColor: TEAL, color: "#fff", padding: "11px 28px", borderRadius: 10 }}>
        Geri Dön
      </Button>
    </div>
  );
}

// ─── Ücret + KVKK Kutusu (müşteri dışı formlar) ─────────────────────────────
function PricingKvkkBox({ control }: { control: any }) {
  return (
    <div className="register-pricing">
      {/* KVKK Onay */}
      <FormField
        control={control}
        name="kvkkConsent"
        render={({ field }) => (
          <FormItem>
            <div className="register-kvkk-box">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {KVKK_PAID}
              </p>
              <div className="flex items-start gap-3 pt-1">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                    style={{ accentColor: TEAL }}
                  />
                </FormControl>
                <FormLabel className="text-sm font-medium text-white cursor-pointer leading-relaxed">
                  KVKK koşullarını ve Kullanım Şartlarını okudum, anladım ve kabul ediyorum.
                </FormLabel>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function MultiChoiceField({ control, name, label, options }: { control: any; name: string; label: string; options: string[] }) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label} — istediğiniz kadar seçebilirsiniz</FormLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button type="button" className="register-select-all" onClick={() => field.onChange(options)}>Tümünü seç</button>
          <button type="button" className="register-select-all" onClick={() => field.onChange([])}>Temizle</button>
        </div>
        <div className="register-specialty-grid">
          {options.map((option) => {
            const checked = (field.value ?? []).includes(option);
            return (
              <label key={option} className={`register-specialty-option${checked ? " is-selected" : ""}`}>
                <Checkbox checked={checked} onCheckedChange={(value) => field.onChange(value ? [...(field.value ?? []), option] : (field.value ?? []).filter((item: string) => item !== option))} />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
        <FormMessage />
      </FormItem>
    )} />
  );
}

type ServiceAreaSummary = {
  districts: string[];
  neighborhoods: string[];
};

function ConfirmedServiceAreas({ summary }: { summary: ServiceAreaSummary }) {
  return (
    <div className="service-area-confirmed" role="status" aria-live="polite">
      <div className="service-area-confirmed-head">
        <div>
          <strong>Hizmet bölgeleri onaylandı</strong>
          <span>Başvurunuza eklenecek seçimler</span>
        </div>
        <span className="service-area-confirmed-check">✓</span>
      </div>
      <div className="service-area-counts">
        <span>{summary.districts.length} ilçe</span>
        <span>{summary.neighborhoods.length} mahalle / semt</span>
        <span>{summary.districts.length + summary.neighborhoods.length} toplam seçim</span>
      </div>
      {summary.districts.length > 0 && (
        <div className="service-area-confirmed-group">
          <b>İlçeler</b>
          <div className="service-area-confirmed-list">
            {summary.districts.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      )}
      {summary.neighborhoods.length > 0 && (
        <div className="service-area-confirmed-group">
          <b>Mahalle / semtler</b>
          <div className="service-area-confirmed-list">
            {summary.neighborhoods.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceAreaPicker({ control, name, label, onConfirmed }: { control: any; name: string; label: string; onConfirmed?: (summary: ServiceAreaSummary) => void }) {
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const districts = ANTALYA_DISTRICTS;
  return (
    <FormField control={control} name={name} render={({ field }) => {
      const selected = (field.value ?? []) as string[];
      const districtNames = Object.keys(districts);
      const activeDistrict = districts[district] ? district : districtNames[0];
      const toggle = (value: string) => field.onChange(
        selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      );
      return (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="service-area-picker">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                className="service-area-all"
                onClick={() => field.onChange(districtNames)}
              >
                Tüm ilçeleri seç
              </button>
              <button
                type="button"
                className="service-area-all"
                onClick={() => field.onChange([...new Set([...selected.filter((item) => !item.includes(" / ")), ...(districts[activeDistrict] ?? []).map((item) => `${activeDistrict} / ${item}`)])])}
              >
                {activeDistrict} — tüm mahalleleri seç
              </button>
              <button
                type="button"
                className="service-area-all"
                onClick={() => field.onChange(districtNames.flatMap((item) => [item, ...(districts[item] ?? []).map((neighborhood) => `${item} / ${neighborhood}`)]))}
              >
                Tüm ilçe ve mahalleleri seç
              </button>
              <button type="button" className="service-area-all" onClick={() => field.onChange([])}>Temizle</button>
              {onConfirmed && (
                <button
                  type="button"
                  className="service-area-confirm-button"
                  disabled={selected.length === 0}
                  onClick={() => onConfirmed({
                    districts: selected.filter((item) => !item.includes(" / ")),
                    neighborhoods: selected.filter((item) => item.includes(" / ")),
                  })}
                >
                  ✓ Seçimleri onayla ({selected.length})
                </button>
              )}
            </div>
            <div className="service-area-districts">
              {districtNames.map((item) => <button type="button" key={item} className={`service-area-district ${activeDistrict === item ? "active" : ""}`} onClick={() => setDistrict(item)}>{item}</button>)}
            </div>
            <div className="service-area-heading"><span>{activeDistrict} mahalle / semtleri</span><small>{selected.filter((item) => item.startsWith(`${activeDistrict} /`)).length} seçildi</small></div>
            <div className="service-area-heading"><small>{selected.filter((item) => !item.includes(" / ")).length} ilçe geneli · {selected.filter((item) => item.includes(" / ")).length} mahalle seçildi</small></div>
            <div className="service-area-neighborhoods">
              {(districts[activeDistrict] ?? []).map((neighborhood) => {
                const value = `${activeDistrict} / ${neighborhood}`;
                return <button type="button" key={value} className={`service-area-neighborhood ${selected.includes(value) ? "active" : ""}`} onClick={() => toggle(value)}>{neighborhood}</button>;
              })}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      );
    }} />
  );
}

function MembershipActions() {
  return (
    <div className="membership-actions" aria-label="Üyelik işlemleri">
      <div className="membership-actions-heading">
        <strong>Üyelik ve gizlilik işlemleri</strong>
        <span>Kaydınızdan sonra hesap işlemleri için destek ekibimize ulaşabilirsiniz.</span>
      </div>
      <div className="membership-actions-buttons">
          <a className="membership-cancel-link" href={appPath("destek?topic=uyelik-iptali")}>Üyelik iptal talebi</a>
          <a className="membership-action-link" href={appPath("gizlilik")}>KVKK ve gizlilik</a>
      </div>
    </div>
  );
}

function ProfessionalSubscriptionActions() {
  const [userId] = useState(() => {
    const key = "uc_subscription_user_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = `web-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, created);
    return created;
  });
  const [bankTransfer, setBankTransfer] = useState<{ companyName: string; iban: string; referenceCode: string; configured: boolean } | null>(null);
  const openBankTransfer = async () => {
    setBankTransfer({
      companyName: "Usta Cepte",
      iban: "",
      referenceCode: userId,
      configured: false,
    });
  };
  return (
    <>
      <div className="subscription-card registration-subscription-card">
        <div className="subscription-card-copy">
          <div className="subscription-card-label">PROFESYONEL ÜYELİK</div>
          <strong>Usta Cepte hizmetlerini kullanmaya devam etmek için aylık kullanım bedeli 3.000 TL'dir.</strong>
          <span>Bu ödeme alanı yalnızca müşteri dışındaki profesyonel kayıt panellerinde gösterilir.</span>
        </div>
        <div className="subscription-actions">
          <a href={appPath(`pay?user_id=${encodeURIComponent(userId)}`)} className="subscription-pay">Kredi / Banka Kartı ile Öde</a>
          <button type="button" onClick={openBankTransfer} className="subscription-transfer">IBAN / Havale ile Öde</button>
        </div>
      </div>
      {bankTransfer && (
        <div className="subscription-modal-backdrop" role="presentation" onClick={() => setBankTransfer(null)}>
          <div className="subscription-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="subscription-modal-close" onClick={() => setBankTransfer(null)} aria-label="Kapat">×</button>
            <div className="subscription-card-label">HAVALE / EFT BİLGİLERİ</div>
            <h2>{bankTransfer.companyName}</h2>
            {bankTransfer.configured ? <><div className="bank-field"><span>IBAN</span><strong>{bankTransfer.iban}</strong></div><div className="bank-field"><span>Referans Kodunuz</span><strong>{bankTransfer.referenceCode}</strong></div><p>3.000 TL gönderirken açıklama alanına referans kodunuzu ekleyin.</p></> : <p>Şirket IBAN bilgisi henüz yapılandırılmadı. Lütfen destek ekibiyle iletişime geçin.</p>}
            <button type="button" className="subscription-pay" onClick={() => setBankTransfer(null)}>Tamam</button>
          </div>
        </div>
      )}
    </>
  );
}

function SiteManagementSubscriptionActions() {
  return (
    <div className="subscription-card registration-subscription-card">
      <div className="membership-actions-heading">
        <strong>Site Yönetimi Üyeliği</strong>
        <span>
          Aylık 3.000 ₺ karşılığında sitenizin ortak alan ve daire usta ihtiyaçlarını Usta Cepte üzerinden yönetebilir,
          sakinlerinize güvenilir usta bulma hizmeti sunabilirsiniz.
        </span>
      </div>
      <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
        <li>Site ve daire sakinleri için usta talebi oluşturma</li>
        <li>Talep durumlarını ve devam eden işleri takip etme</li>
        <li>Usta Cepte’yi bina sakinlerine önererek hizmete hızlı erişim sağlama</li>
      </ul>
      <div style={{ marginTop: 10, color: "var(--navy)", fontSize: 12, fontWeight: 700 }}>
        Ödeme ve aktivasyon, başvurunun onaylanmasından sonra başlar.
      </div>
      <ProfessionalSubscriptionActions />
    </div>
  );
}

// ─── MÜŞTERI FORMU ───────────────────────────────────────────────────────────
function CustomerForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [registerPending, setRegisterPending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "", password: "", district: "", neighborhood: "", address: "", kvkkConsent: false },
  });

  const onSubmit = async (data: z.infer<typeof customerSchema>) => {
    setSubmitError("");
    const address = [neighborhood, data.address].filter(Boolean).join(", ");
    const registrationData = { ...data, address: address || undefined };
    setRegisterPending(true);
    try {
      const result = await postRegister("customer", registrationData);
      if (result.needsEmailConfirmation) {
        toast({ title: "E-posta doğrulaması gerekli", description: "Hesabınızı etkinleştirmek için e-postanızdaki doğrulama bağlantısını açın." });
        return;
      }
      saveRegisteredAccount(registrationData, "Müşteri");
      window.location.href = appPath("?account=1");
    } catch (err: any) {
      const message = err?.message || "Kayıt başarısız. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
      setSubmitError(message);
      toast({ variant: "destructive", title: "Kayıt tamamlanmadı", description: message });
    } finally {
      setRegisterPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="register-form">
        <div className="register-grid">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Ad Soyad</FormLabel><FormControl><Input placeholder="Ahmet Yılmaz" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input placeholder="05XX XXX XX XX" type="tel" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="register-grid">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>E-posta</FormLabel><FormControl><Input placeholder="mail@ornek.com" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem><FormLabel>Şifre</FormLabel><FormControl><Input type="password" placeholder="En az 6 karakter" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="district" render={({ field }) => (
          <FormItem><FormLabel>İlçe</FormLabel>
            <FormControl>
              <select value={field.value} onChange={(event) => { field.onChange(event.target.value); setNeighborhood(""); }}>
                <option value="">İlçe seçin</option>
                {DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </FormControl><FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="neighborhood" render={({ field }) => (
          <FormItem>
            <FormLabel>Mahalle / Semt</FormLabel>
            <FormControl>
              <select
                {...field}
                value={field.value ?? neighborhood}
                onChange={(event) => { field.onChange(event.target.value); setNeighborhood(event.target.value); }}
                disabled={!form.watch("district")}
              >
                <option value="">{form.watch("district") ? "Mahalle / semt seçin" : "Önce ilçe seçin"}</option>
                {(ANTALYA_DISTRICTS[form.watch("district")] ?? []).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem><FormLabel>Adres (isteğe bağlı)</FormLabel><FormControl><Input placeholder="Mahalle, sokak..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        {/* KVKK - Müşteri için kısa */}
        <FormField control={form.control} name="kvkkConsent" render={({ field }) => (
          <FormItem>
            <div className="register-kvkk-box">
              <p className="text-xs text-muted-foreground leading-relaxed">{KVKK_SHORT}</p>
              <div className="flex items-start gap-3">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" /></FormControl>
                <FormLabel className="text-sm font-medium text-white cursor-pointer">KVKK metnini okudum ve kabul ediyorum.</FormLabel>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )} />

        {submitError && (
          <div role="alert" style={{ padding: "12px 14px", border: "1px solid #E7A7A7", borderRadius: 10, color: "#9D2C2C", background: "#FFF1F1", fontSize: 13, lineHeight: 1.5, fontWeight: 600 }}>
            {submitError}
          </div>
        )}
        <Button type="submit" className="w-full h-12 text-base font-bold" style={{ backgroundColor: TEAL, color: "#121212" }} disabled={registerPending}>
          {registerPending ? "Kaydediliyor..." : "Ücretsiz Kayıt Ol"}
        </Button>
      </form>
    </Form>
  );
}

// ─── USTA FORMU ─────────────────────────────────────────────────────────────
function UstaForm({ onSuccess, fixedSpecialty }: { onSuccess: () => void; fixedSpecialty?: string }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [areasConfirmed, setAreasConfirmed] = useState(false);
  const [areasSummary, setAreasSummary] = useState<ServiceAreaSummary | null>(null);
  const form = useForm<z.infer<typeof ustaSchema>>({
    resolver: zodResolver(ustaSchema),
    defaultValues: { name: "", phone: "", email: "", password: "", idNumber: "", specialty: fixedSpecialty ?? "", specialties: fixedSpecialty ? [fixedSpecialty] : [], experience: 0, district: "", serviceAreas: [], about: "", teamSize: fixedSpecialty ? "1 kişilik ekip" : "", kvkkConsent: false },
  });

  const onSubmit = (data: z.infer<typeof ustaSchema>) => {
    if (!areasConfirmed) {
      toast({ variant: "destructive", title: "Hizmet bölgelerini onaylayın", description: "Seçimlerden sonra onay düğmesine basın." });
      return;
    }
    setSending(true);
    const key = "uc_professional_device_id";
    const deviceId = localStorage.getItem(key) ?? `web-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, deviceId);
    postRegister("craftsman", {
      ...data,
      specialty: data.specialties[0],
      district: data.serviceAreas[0],
      about: data.teamSize ? `${data.about ?? ""}\nEkip: ${data.teamSize}` : data.about,
    }, deviceId)
      .then(() => { saveRegisteredAccount(data, "Usta"); onSuccess(); })
      .catch((err: any) => toast({ variant: "destructive", title: "Hata", description: err?.error || "Kayıt başarısız." }))
      .finally(() => setSending(false));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="register-form">
        <div className="register-grid">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Ad Soyad</FormLabel><FormControl><Input placeholder="Mehmet Usta" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input placeholder="05XX XXX XX XX" type="tel" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="register-grid">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>E-posta</FormLabel><FormControl><Input placeholder="usta@ornek.com" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem><FormLabel>Şifre</FormLabel><FormControl><Input type="password" placeholder="En az 6 karakter" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="register-grid">
          <FormField control={form.control} name="idNumber" render={({ field }) => (
            <FormItem><FormLabel>TC Kimlik No</FormLabel><FormControl><Input placeholder="11 haneli TC No" maxLength={11} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="experience" render={({ field }) => (
            <FormItem><FormLabel>Deneyim (Yıl)</FormLabel><FormControl><Input type="number" min={0} max={50} placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <MultiChoiceField control={form.control} name="specialties" label={fixedSpecialty ? "Hizmet türü" : "Yaptığınız iş / branşlar"} options={fixedSpecialty ? ["Ev Temizliği"] : USTA_CATEGORIES} />
        {fixedSpecialty && <FormField control={form.control} name="teamSize" render={({ field }) => (
          <FormItem><FormLabel>Ekibiniz kaç kişilik?</FormLabel>
            <FormControl><select value={field.value} onChange={(event) => field.onChange(event.target.value)}>
              {CLEANING_TEAM_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select></FormControl><FormMessage />
          </FormItem>
        )} />}
        <ServiceAreaPicker
          control={form.control}
          name="serviceAreas"
          label="Hizmet bölgeleri — ilçe seçin, ardından mahalle / semt seçin"
          onConfirmed={(summary) => { setAreasConfirmed(true); setAreasSummary(summary); }}
        />
        {areasConfirmed && areasSummary && <ConfirmedServiceAreas summary={areasSummary} />}
        <FormField control={form.control} name="about" render={({ field }) => (
          <FormItem><FormLabel>Hakkında (isteğe bağlı)</FormLabel><FormControl><Textarea placeholder="Kendinizi ve yaptığınız işleri kısaca anlatın..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <PricingKvkkBox control={form.control} />

        <ProfessionalSubscriptionActions />
        <MembershipActions />
        <Button type="submit" className="w-full h-12 text-base font-bold" style={{ backgroundColor: "#FF9500", color: "#fff" }} disabled={sending}>
          {sending ? "Başvuru Gönderiliyor..." : `${fixedSpecialty ? "Ev Temizliği Başvurusu" : "Usta Olarak Başvur"}`}
        </Button>
      </form>
    </Form>
  );
}

// ─── SİTE YÖNETİMİ FORMU ────────────────────────────────────────────────────
function SiteForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof siteSchema>>({
    resolver: zodResolver(siteSchema),
    defaultValues: { name: "", email: "", password: "", siteName: "", siteAddress: "", district: "", unitCount: 0, kvkkConsent: false },
  });

  const onSubmit = async (data: z.infer<typeof siteSchema>) => {
    setLoading(true);
    try {
      const result = await postRegister("site-yonetimi", data);
      if (result.needsEmailConfirmation) {
        toast({ title: "E-posta doğrulaması gerekli", description: "Hesabınızı etkinleştirmek için e-postanızdaki doğrulama bağlantısını açın." });
        return;
      }
      saveRegisteredAccount(data, "Site yönetimi");
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Hata", description: err?.error || "Kayıt başarısız." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="register-form">
        <div style={{ border: "1px solid rgba(0,200,179,.35)", background: "rgba(0,200,179,.08)", borderRadius: 14, padding: 16 }}>
          <strong style={{ display: "block", color: "var(--navy)", marginBottom: 6 }}>Site ve apartman hizmet yönetimi</strong>
          <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55 }}>
            Ortak alan, bina, tesisat, elektrik, temizlik ve daire içi usta ihtiyaçlarını site yönetimi adına oluşturun; uygun ustaları tek ekrandan görün ve talepleri takip edin.
          </span>
        </div>
        <div className="register-grid">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Yetkili Ad Soyad</FormLabel><FormControl><Input placeholder="Ali Demir" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>E-posta</FormLabel><FormControl><Input placeholder="yonetim@site.com" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Şifre</FormLabel><FormControl><Input type="password" placeholder="En az 6 karakter" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="register-grid">
          <FormField control={form.control} name="siteName" render={({ field }) => (
            <FormItem><FormLabel>Site / Bina Adı</FormLabel><FormControl><Input placeholder="Lara Konutları A Blok" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="unitCount" render={({ field }) => (
            <FormItem><FormLabel>Toplam Daire Sayısı</FormLabel><FormControl><Input type="number" min={1} placeholder="48" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="district" render={({ field }) => (
          <FormItem><FormLabel>İlçe</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="İlçe seçin" /></SelectTrigger></FormControl>
              <SelectContent>{DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="siteAddress" render={({ field }) => (
          <FormItem><FormLabel>Site / Bina Adresi</FormLabel><FormControl><Input placeholder="Mahalle, cadde, kapı no..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="kvkkConsent" render={({ field }) => (
          <FormItem>
            <div className="register-kvkk-box">
              <p className="text-xs text-muted-foreground leading-relaxed">{KVKK_SHORT} Site ve bina yönetimi bilgilerimin hizmet talebi oluşturma ve iletişim amacıyla işlenmesini kabul ediyorum.</p>
              <div className="flex items-start gap-3">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" /></FormControl>
                <FormLabel className="text-sm font-medium text-white cursor-pointer">KVKK metnini ve site hizmet kullanım koşullarını kabul ediyorum.</FormLabel>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )} />

        <SiteManagementSubscriptionActions />
        <MembershipActions />
        <Button type="submit" className="w-full h-12 text-base font-bold" style={{ backgroundColor: "#FF9500", color: "#fff" }} disabled={loading}>
          {loading ? "Başvuru Gönderiliyor..." : "Site Yönetimi Kaydı"}
        </Button>
      </form>
    </Form>
  );
}

// ─── NAKLİYECİ FORMU ────────────────────────────────────────────────────────
function NakliyeciForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [areasConfirmed, setAreasConfirmed] = useState(false);
  const [areasSummary, setAreasSummary] = useState<ServiceAreaSummary | null>(null);
  const form = useForm<z.infer<typeof nakliyeciSchema>>({
    resolver: zodResolver(nakliyeciSchema),
    defaultValues: { name: "", phone: "", email: "", password: "", idNumber: "", licenseNumber: "", licenseClass: "", vehicleType: "", vehicleTypes: [], licensePlate: "", capacity: "", district: "", serviceAreas: [], experience: 0, kvkkConsent: false },
  });

  const onSubmit = async (data: z.infer<typeof nakliyeciSchema>) => {
    if (!areasConfirmed) {
      toast({ variant: "destructive", title: "Hizmet bölgelerini onaylayın", description: "Seçimlerden sonra onay düğmesine basın." });
      return;
    }
    setLoading(true);
    try {
      const result = await postRegister("nakliyeci", { ...data, vehicleType: data.vehicleTypes[0] });
      if (result.needsEmailConfirmation) {
        toast({ title: "E-posta doğrulaması gerekli", description: "Hesabınızı etkinleştirmek için e-postanızdaki doğrulama bağlantısını açın." });
        return;
      }
      saveRegisteredAccount(data, "Nakliyeci");
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Hata", description: err?.error || "Kayıt başarısız." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="register-form">
        <div className="register-grid">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Ad Soyad</FormLabel><FormControl><Input placeholder="Hasan Kaya" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input placeholder="05XX XXX XX XX" type="tel" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="register-grid">
          <FormField control={form.control} name="idNumber" render={({ field }) => (
            <FormItem><FormLabel>TC Kimlik No</FormLabel><FormControl><Input placeholder="11 haneli TC Kimlik No" inputMode="numeric" maxLength={11} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="licenseNumber" render={({ field }) => (
            <FormItem><FormLabel>Ehliyet No</FormLabel><FormControl><Input placeholder="Ehliyet belge numarası" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="licenseClass" render={({ field }) => (
          <FormItem><FormLabel>Ehliyet Sınıfı</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Ehliyet sınıfı seçin" /></SelectTrigger></FormControl>
              <SelectContent>{LICENSE_CLASSES.map((licenseClass) => <SelectItem key={licenseClass} value={licenseClass}>{licenseClass}</SelectItem>)}</SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <div className="register-grid">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>E-posta</FormLabel><FormControl><Input placeholder="nakliye@ornek.com" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem><FormLabel>Şifre</FormLabel><FormControl><Input type="password" placeholder="En az 6 karakter" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="register-grid">
          <MultiChoiceField control={form.control} name="vehicleTypes" label="Kendi sunduğunuz nakliye araç/hizmetleri (en fazla 3)" options={VEHICLE_TYPES} />
          <FormField control={form.control} name="licensePlate" render={({ field }) => (
            <FormItem><FormLabel>Plaka</FormLabel><FormControl><Input placeholder="07 ABC 123" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="register-grid">
          <ServiceAreaPicker
            control={form.control}
            name="serviceAreas"
            label="Hizmet bölgeleri — ilçe seçin, ardından mahalle / semt seçin"
            onConfirmed={(summary) => { setAreasConfirmed(true); setAreasSummary(summary); }}
          />
          {areasConfirmed && areasSummary && <ConfirmedServiceAreas summary={areasSummary} />}
          <FormField control={form.control} name="experience" render={({ field }) => (
            <FormItem><FormLabel>Deneyim (Yıl)</FormLabel><FormControl><Input type="number" min={0} max={50} placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="capacity" render={({ field }) => (
          <FormItem><FormLabel>Taşıma Kapasitesi (isteğe bağlı)</FormLabel><FormControl><Input placeholder="Örn: 5 ton, hacim 30 m³" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <PricingKvkkBox control={form.control} />

        <ProfessionalSubscriptionActions />
        <MembershipActions />
        <Button type="submit" className="w-full h-12 text-base font-bold" style={{ backgroundColor: "#FF9500", color: "#fff" }} disabled={loading}>
          {loading ? "Başvuru Gönderiliyor..." : "Nakliyeci Kaydı"}
        </Button>
      </form>
    </Form>
  );
}

export default function Register() {
  const [successRole, setSuccessRole] = useState<string | null>(null);
  const [hasActiveAccount, setHasActiveAccount] = useState(() => {
    try { return Boolean(JSON.parse(localStorage.getItem("usta-cepte-account") ?? "null")?.active); } catch { return false; }
  });
  const selectedPanel = new URLSearchParams(window.location.search).get("panel") ?? "musteri-kayit";

  return (
    <Layout>
      <div className="registration-page">
        <header className="registration-header">
          <span className="registration-eyebrow">PROFESYONEL ÜYELİK</span>
          <h1>Usta Cepte’ye katılın</h1>
          <p>Hizmetinizi Antalya’daki müşterilerle buluşturmak için uygun kayıt panelini tamamlayın.</p>
        </header>
        <AccountActions onActiveChange={setHasActiveAccount} />

        <div className="registration-panels">
          {selectedPanel === "usta-kayit" && <section id="usta-kayit" className="registration-panel" aria-labelledby="usta-kayit-title">
            <div className="registration-panel-heading">
              <span className="registration-icon" style={{ background: "rgba(220,122,46,0.13)" }}>
                <Wrench size={22} color="var(--copper)" />
              </span>
              <div>
                <h2 id="usta-kayit-title">Usta kayıt paneli</h2>
                <p>Uzmanlık alanınızı ve hizmet bölgenizi belirtin.</p>
              </div>
            </div>
            {successRole === "usta"
              ? <SuccessScreen role="usta" onBack={() => setSuccessRole(null)} />
              : <UstaForm onSuccess={() => setSuccessRole("usta")} />}
          </section>}

          {selectedPanel === "temizlik-kayit" && <section id="temizlik-kayit" className="registration-panel" aria-labelledby="temizlik-kayit-title">
            <div className="registration-panel-heading">
              <span className="registration-icon" style={{ background: "rgba(15,122,99,0.12)" }}>
                <CheckCircle2 size={22} color="var(--teal)" />
              </span>
              <div>
                <h2 id="temizlik-kayit-title">Ev Temizliği kayıt paneli</h2>
                <p>Ev temizliği hizmeti vermek için ayrı başvurunuzu tamamlayın.</p>
              </div>
            </div>
            {successRole === "temizlik"
              ? <SuccessScreen role="usta" onBack={() => setSuccessRole(null)} />
              : <UstaForm fixedSpecialty="Ev Temizliği" onSuccess={() => setSuccessRole("temizlik")} />}
          </section>}

          {selectedPanel === "nakliyeci-kayit" && <section id="nakliyeci-kayit" className="registration-panel" aria-labelledby="nakliyeci-kayit-title">
            <div className="registration-panel-heading">
              <span className="registration-icon" style={{ background: "rgba(15,122,99,0.12)" }}>
                <Truck size={22} color="var(--teal)" />
              </span>
              <div>
                <h2 id="nakliyeci-kayit-title">Nakliyeci kayıt paneli</h2>
                <p>Araç ve taşıma bilgilerinizi ekleyin.</p>
              </div>
            </div>
            {successRole === "nakliyeci"
              ? <SuccessScreen role="nakliyeci" onBack={() => setSuccessRole(null)} />
              : <NakliyeciForm onSuccess={() => setSuccessRole("nakliyeci")} />}
          </section>}

          {selectedPanel === "site-kayit" && <section className="registration-panel registration-panel-wide" aria-labelledby="site-kayit">
            <div className="registration-panel-heading">
              <span className="registration-icon" style={{ background: "rgba(27,42,60,0.1)" }}>
                <Building2 size={22} color="var(--navy)" />
              </span>
              <div>
                <h2 id="site-kayit">Daire / Site Yönetimleri kayıt paneli</h2>
                <p>Daire, apartman veya sitenizin yönetim hesabını oluşturun.</p>
              </div>
            </div>
            {successRole === "site"
              ? <SuccessScreen role="site" onBack={() => setSuccessRole(null)} />
              : <SiteForm onSuccess={() => setSuccessRole("site")} />}
          </section>}

          {selectedPanel === "musteri-kayit" && <section className="registration-panel registration-panel-wide registration-panel-customer" aria-labelledby="musteri-kayit">
            <div className="registration-panel-heading">
              <span className="registration-icon" style={{ background: "rgba(15,122,99,0.12)" }}>
                <CheckCircle2 size={22} color="var(--teal)" />
              </span>
              <div>
                <h2 id="musteri-kayit">Müşteri kayıt paneli</h2>
                <p>Usta talepleri oluşturmak için ücretsiz müşteri hesabınızı açın.</p>
              </div>
            </div>
            {hasActiveAccount ? (
              <div className="registered-customer-panel">
                <h3>Profiliniz hazır</h3>
                <p>Bu hesapla yeni müşteri kaydı oluşturmanız gerekmiyor. Taleplerinizi ana uygulamadan oluşturup takip edebilirsiniz.</p>
                <Button type="button" onClick={() => { window.location.href = appPath(); }} style={{ backgroundColor: TEAL, color: "#fff" }}>
                  Ana Sayfaya Git
                </Button>
              </div>
            ) : successRole === "customer"
              ? <SuccessScreen role="customer" onBack={() => setSuccessRole(null)} />
              : <CustomerForm onSuccess={() => setSuccessRole("customer")} />}
          </section>}
        </div>

      </div>
    </Layout>
  );
}
