import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appPath } from "@/lib/navigation";

const fallbackUrl = "https://vqccltoturhepqzyskyu.supabase.co";
const fallbackAnonKey = "sb_publishable_WXuD2ii-PoyuvvdIXkM-rg_mGWwaEGV";
const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim() || fallbackUrl;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim() || fallbackAnonKey;
export const privilegedAdminEmail = "bekirsevcan1@gmail.com";

export function isPrivilegedAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === privilegedAdminEmail;
}

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = createClient(
  url,
  anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export type RegistrationPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  district?: string;
  address?: string;
  idNumber?: string;
  specialty?: string;
  specialties?: string[];
  serviceAreas?: string[];
  experience?: number | string;
  about?: string;
  kvkkConsent?: boolean;
  siteName?: string;
  siteAddress?: string;
  unitCount?: number;
  licenseNumber?: string;
  licenseClass?: string;
  vehicleTypes?: string[];
  licensePlate?: string;
  capacity?: string;
};

function requireSupabase() {
  if (!supabaseConfigured) {
    throw new Error("Supabase bağlantısı yapılandırılmamış. Vercel’de VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlayın.");
  }
}

function supabaseError(error: { message?: string } | null) {
  if (!error) return;
  const message = error.message || "";
  if (/could not find the table ['"]?public\.requests|relation ['"]?public\.requests['"]? does not exist|schema cache/i.test(message)) {
    throw new Error("Talep tablosu henüz hazır değil. Supabase SQL Editor’da frontend-only.sql dosyasını çalıştırdıktan sonra tekrar deneyin.");
  }
  if (/could not find the table|relation .* does not exist/i.test(message)) {
    throw new Error("Supabase veritabanı şeması hazır değil. frontend-only.sql dosyasını Supabase SQL Editor’da çalıştırdıktan sonra tekrar deneyin.");
  }
  const retryMatch = message.match(/only request this after\s+(\d+)\s+seconds?/i);
  if (retryMatch) {
    throw new Error(`Güvenlik nedeniyle çok kısa sürede çok fazla deneme yapıldı. Lütfen ${retryMatch[1]} saniye bekleyip tekrar deneyin.`);
  }
  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(message)) {
    throw new Error("Çok fazla kayıt veya e-posta denemesi yapıldı. Lütfen birkaç dakika bekleyip tekrar deneyin.");
  }
  throw new Error(message || "Supabase isteği başarısız.");
}

export async function signInWithPassword(email: string, password: string) {
  requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  supabaseError(error);
  if (!data.user) throw new Error("Giriş yapılamadı.");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();
  supabaseError(profileError);
  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    throw new Error("Bu hesap engellenmiştir.");
  }
  const isPrivilegedAdmin = isPrivilegedAdminEmail(data.user.email ?? email);
  return {
    user: data.user,
    profile: profile
      ? { ...profile, ...(isPrivilegedAdmin ? { role: "admin" } : {}) }
      : { id: data.user.id, email: data.user.email, ...(isPrivilegedAdmin ? { role: "admin" } : {}) },
  };
}

export async function signOut() {
  if (supabaseConfigured) await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  let { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}${appPath("reset-password")}`,
  });
  // A fresh preview/Vercel hostname may not yet be in Supabase's redirect
  // allow-list. Retry without an override so Supabase can use its configured
  // Site URL and still deliver the recovery email.
  if (error && /redirect|url|allow.?list/i.test(error.message ?? "")) {
    ({ error } = await supabase.auth.resetPasswordForEmail(normalizedEmail));
  }
  supabaseError(error);
}

export async function registerWithSupabase(payload: RegistrationPayload) {
  requireSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    options: { data: { name: payload.name, role: payload.role } },
  });
  supabaseError(error);
  if (!data.user) throw new Error("Hesap oluşturulamadı.");

  if (data.session) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      name: payload.name,
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone ?? null,
      role: payload.role,
      district: payload.district ?? null,
      address: payload.address ?? null,
      id_number: payload.idNumber ?? null,
      service_areas: payload.serviceAreas ?? [],
      kvkk_consent: Boolean(payload.kvkkConsent),
      kvkk_consent_at: payload.kvkkConsent ? new Date().toISOString() : null,
      kvkk_consent_version: "2026-08-21",
      is_approved: payload.role === "customer",
    });
    supabaseError(profileError);
  }

  if (data.session && (payload.role === "craftsman" || payload.role === "nakliyeci")) {
    const { error: providerError } = await supabase.from("ustas").insert({
      profile_id: data.user.id,
      name: payload.name,
      phone: payload.phone ?? null,
      specialty: payload.specialty || payload.specialties?.[0] || "Hizmet veren",
      specialties: payload.specialties ?? [],
      category_id: (payload.specialties?.[0] || "diger").toLowerCase().replaceAll(" ", "_"),
      experience: Number(payload.experience ?? 0),
      bio: payload.about ?? null,
      service_areas: payload.serviceAreas ?? [],
      is_online: false,
      verified: false,
    });
    supabaseError(providerError);
  }

  return { user: data.user, session: data.session, needsEmailConfirmation: !data.session };
}

export async function listNearbyProviders() {
  requireSupabase();
  const [{ data: providers, error: providerError }, { data: locations, error: locationError }] = await Promise.all([
    supabase.from("ustas").select("id,name,specialty,rating,review_count,lat,lng,is_online,service_areas").eq("verified", true),
    supabase.from("usta_locations").select("usta_id,usta_name,specialty,lat,lng,heading,is_online,updated_at").eq("is_online", "true"),
  ]);
  supabaseError(providerError);
  supabaseError(locationError);
  return {
    providers: (providers ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name,
      specialty: row.specialty,
      rating: Number(row.rating ?? 0),
      reviewCount: Number(row.review_count ?? 0),
      lat: row.lat,
      lng: row.lng,
      isOnline: Boolean(row.is_online),
      district: (row.service_areas ?? []).find((area: string) => !area.includes(" / ")),
    })),
    locations: (locations ?? []).map((row) => ({
      ustaId: Number(row.usta_id),
      ustaName: row.usta_name,
      specialty: row.specialty,
      lat: row.lat,
      lng: row.lng,
      heading: row.heading,
      isOnline: row.is_online === "true",
      updatedAt: row.updated_at,
    })),
  };
}

export function subscribeToLocations(onChange: () => void) {
  if (!supabaseConfigured) return () => undefined;
  const channel = supabase
    .channel("usta-locations")
    .on("postgres_changes", { event: "*", schema: "public", table: "usta_locations" }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function upsertOwnLocation(location: {
  ustaId: number;
  ustaName: string;
  specialty: string;
  categoryId: string;
  lat: number;
  lng: number;
  heading?: number;
  isOnline: boolean;
}) {
  requireSupabase();
  const { error } = await supabase.from("usta_locations").upsert({
    usta_id: location.ustaId,
    usta_name: location.ustaName,
    specialty: location.specialty,
    category_id: location.categoryId,
    lat: location.lat,
    lng: location.lng,
    heading: location.heading ?? null,
    is_online: location.isOnline ? "true" : "false",
    updated_at: new Date().toISOString(),
  }, { onConflict: "usta_id" });
  supabaseError(error);
}

export async function getAdminDashboard() {
  requireSupabase();
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Yönetici oturumu gerekli.");
  const [{ data: profiles, error: profileError }, { data: requests, error: requestError }, { data: locations, error: locationError }] = await Promise.all([
    // Keep this projection compatible with deployments where the optional
    // profile name column was never created. The UI derives a display name
    // from email when it is absent.
    supabase.from("profiles").select("id,email,role,is_approved,is_blocked,created_at"),
    supabase.from("requests").select("*").order("updated_at", { ascending: false }),
    supabase.from("usta_locations").select("*").eq("is_online", "true"),
  ]);
  supabaseError(profileError);
  supabaseError(requestError);
  supabaseError(locationError);
  const users = profiles ?? [];
  const requestRows = requests ?? [];
  const openStatuses = new Set(["Beklemede", "Devam Ediyor"]);
  return {
    users: users.map((row) => ({
      id: row.id,
       name: row.email ?? "İsimsiz profil",
      email: row.email,
       phone: null,
      role: row.role,
      district: null,
      isApproved: Boolean(row.is_approved),
      isBlocked: Boolean(row.is_blocked),
      createdAt: row.created_at,
    })),
    overview: {
      users: {
        customers: users.filter((row) => row.role === "customer").length,
        craftsmen: users.filter((row) => row.role === "craftsman").length,
        admins: users.filter((row) => row.role === "admin").length,
        approved: users.filter((row) => row.is_approved).length,
        blocked: users.filter((row) => row.is_blocked).length,
      },
      requests: {
        total: requestRows.length,
        open: requestRows.filter((row) => openStatuses.has(row.status)).length,
        completed: requestRows.filter((row) => row.status === "Tamamlandı").length,
      },
      activeLocations: locations?.length ?? 0,
      revenue: { amount: 0, currency: "TRY", available: false },
    },
    locations: {
      updatedAt: new Date().toISOString(),
      craftsmen: (locations ?? []).map((row) => ({
        id: row.usta_id,
        name: row.usta_name,
        specialty: row.specialty,
        lat: row.lat,
        lng: row.lng,
        updatedAt: row.updated_at,
      })),
      customers: requestRows.filter((row) => row.customer_latitude != null && row.customer_longitude != null && openStatuses.has(row.status)).map((row) => ({
        id: row.id,
        name: row.user_name,
        lat: row.customer_latitude,
        lng: row.customer_longitude,
        status: row.status,
        updatedAt: row.updated_at,
      })),
    },
    requests: requestRows.map((row) => ({
      id: row.id,
      userName: row.user_name,
      categoryName: row.category_name,
      title: row.title,
      priority: row.priority,
      status: row.status,
      trackingStatus: row.tracking_status,
      semt: row.semt,
      mahalle: row.mahalle,
      assignedUstaId: row.assigned_usta_id,
      assignedUsta: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

export type SupportMessage = {
  id: number;
  sessionId: string;
  senderName: string;
  email?: string | null;
  message: string;
  isAgent: boolean;
  createdAt: string;
};

export async function getAdminSupportMessages() {
  requireSupabase();
  const { data, error } = await supabase
    .from("support_messages")
    .select("id,session_id,sender_name,email,message,is_agent,created_at")
    .order("created_at", { ascending: true });
  supabaseError(error);
  return (data ?? []).map((row) => ({
    id: Number(row.id),
    sessionId: row.session_id,
    senderName: row.sender_name,
    email: row.email,
    message: row.message,
    isAgent: Boolean(row.is_agent),
    createdAt: row.created_at,
  })) as SupportMessage[];
}

export async function sendAdminSupportMessage(sessionId: string, message: string) {
  requireSupabase();
  const { data, error } = await supabase
    .from("support_messages")
    .insert({ session_id: sessionId, sender_name: "Usta Cepte Destek", message: message.trim(), is_agent: true })
    .select("id,session_id,sender_name,email,message,is_agent,created_at")
    .single();
  supabaseError(error);
  if (!data) throw new Error("Admin yanıtı kaydedilemedi.");
  return {
    id: Number(data.id),
    sessionId: data.session_id,
    senderName: data.sender_name,
    email: data.email,
    message: data.message,
    isAgent: Boolean(data.is_agent),
    createdAt: data.created_at,
  } as SupportMessage;
}

export async function updateAdminProfile(id: string, action: "approve" | "reject" | "block" | "unblock") {
  requireSupabase();
  const patch = action === "approve" ? { is_approved: true, is_blocked: false }
    : action === "reject" ? { is_approved: false }
      : action === "block" ? { is_blocked: true } : { is_blocked: false };
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  supabaseError(error);
}

export async function createServiceRequest(data: {
  title: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  priority: string;
  timeRange?: string;
  address: string;
  customerName: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
}) {
  requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) throw new Error("Talep oluşturmak için giriş yapmalısınız.");
  const [semt = "Antalya", mahalle = "Belirtilmedi"] = data.address.split(",");
  const { data: request, error } = await supabase.from("requests").insert({
    owner_id: sessionData.session.user.id,
    user_name: data.customerName,
    category_id: data.categoryId,
    category_name: data.categoryName,
    title: data.title,
    description: data.description ?? null,
    priority: data.priority,
    time_range: data.timeRange ?? null,
    semt: semt.trim(),
    mahalle: mahalle.trim(),
    status: "Beklemede",
    tracking_status: "Beklemede",
    customer_latitude: data.latitude ?? null,
    customer_longitude: data.longitude ?? null,
    photos: data.photos ?? [],
  }).select("*").single();
  supabaseError(error);
  return request;
}

export type RequestAction =
  | "provider_delivered"
  | "customer_received"
  | "customer_cancelled"
  | "customer_absent"
  | "customer_unreachable";

const requestActionLabels: Record<RequestAction, string> = {
  provider_delivered: "İşi teslim ettim",
  customer_received: "İşi teslim aldım",
  customer_cancelled: "Talebi iptal etti",
  customer_absent: "Müşteri adreste yoktu",
  customer_unreachable: "Müşteriye ulaşılamıyor",
};

export async function updateServiceRequestAction(requestId: number, action: RequestAction, reason?: string) {
  requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error("Bu işlemi yapmak için giriş yapmalısınız.");

  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("id,owner_id,assigned_usta_id,status,tracking_status")
    .eq("id", requestId)
    .single();
  supabaseError(requestError);
  if (!request) throw new Error("Talep bulunamadı.");

  const { data: provider } = request.assigned_usta_id
    ? await supabase.from("ustas").select("profile_id").eq("id", request.assigned_usta_id).maybeSingle()
    : { data: null };
  const isOwner = request.owner_id === user.id;
  const isProvider = provider?.profile_id === user.id;
  if (!isOwner && !isProvider) throw new Error("Bu talep üzerinde işlem yapma yetkiniz yok.");

  const providerActions: RequestAction[] = ["provider_delivered", "customer_absent", "customer_unreachable"];
  const customerActions: RequestAction[] = ["customer_received", "customer_cancelled"];
  if ((providerActions.includes(action) && !isProvider) || (customerActions.includes(action) && !isOwner)) {
    throw new Error("Bu işlem yalnızca ilgili kullanıcı tarafından yapılabilir.");
  }
  if (action === "customer_received" && request.status !== "Teslim Edildi") {
    throw new Error("Müşteri teslim onayını, usta teslim bildirdikten sonra verebilir.");
  }
  if (action === "provider_delivered" && ["Tamamlandı", "İptal Edildi"].includes(request.status)) {
    throw new Error("Bu talep artık güncellenemez.");
  }
  if (["customer_absent", "customer_unreachable"].includes(action) && request.status !== "Yolda") {
    throw new Error("Ulaşılamama bildirimi yalnızca usta yoldayken yapılabilir.");
  }

  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (action === "provider_delivered") {
    patch.status = "Teslim Edildi";
    patch.tracking_status = "Teslim Edildi";
    patch.delivery_status = "provider_delivered";
  } else if (action === "customer_received") {
    patch.status = "Tamamlandı";
    patch.tracking_status = "Tamamlandı";
    patch.delivery_status = "customer_received";
  } else if (action === "customer_cancelled") {
    patch.status = "İptal Edildi";
    patch.tracking_status = "İptal Edildi";
    patch.cancellation_reason = reason?.trim() || "Müşteri tarafından iptal edildi";
  } else {
    patch.status = action === "customer_absent" ? "Müşteri Adreste Yoktu" : "Müşteriye Ulaşılamıyor";
    patch.tracking_status = "Ulaşılamıyor";
    patch.unreachable_reason = action;
    patch.rating_protected = "true";
  }

  const { data: updated, error } = await supabase.from("requests").update(patch).eq("id", requestId).select("*").single();
  supabaseError(error);
  if (!updated) throw new Error("Talep durumu güncellenemedi.");

  const recipientId = isOwner ? provider?.profile_id : request.owner_id;
  if (recipientId) {
    const { error: notificationError } = await supabase.from("notifications").insert({
      recipient_id: recipientId,
      request_id: requestId,
      title: requestActionLabels[action],
      message: reason?.trim() || `${requestActionLabels[action]} bildirimi oluşturuldu.`,
      type: action,
    });
    supabaseError(notificationError);
  }
  await supabase.from("request_events").insert({
    request_id: requestId,
    actor_id: user.id,
    action,
    reason: reason?.trim() || null,
  });
  return updated;
}

export function subscribeToRequestUpdates(onChange: () => void) {
  if (!supabaseConfigured) return () => undefined;
  const channel = supabase
    .channel("request-updates")
    .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function submitReview(data: { ustaId: number; requestId: number; rating: number; comment?: string; reviewerName: string }) {
  requireSupabase();
  const { error } = await supabase.from("reviews").insert({
    usta_id: data.ustaId,
    request_id: data.requestId,
    rating: Math.max(1, Math.min(5, Math.round(data.rating))),
    comment: data.comment ?? null,
    reviewer_name: data.reviewerName,
  });
  supabaseError(error);
}