import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Check, CircleAlert, Clock3, LogOut, MapPinned, MessageCircle, RefreshCw, Send, ShieldCheck, Users, X } from "lucide-react";
import { getAdminDashboard, getAdminSupportMessages, sendAdminSupportMessage, signInWithPassword, signOut, supabase, updateAdminProfile, type SupportMessage } from "@/lib/supabase";

type AdminTab = "overview" | "users" | "locations" | "requests" | "support";
type AdminUser = { id: number; name: string; email?: string; phone?: string | null; role: string; district?: string | null; specialty?: string; isApproved: boolean; isBlocked: boolean; isOnline?: boolean; createdAt?: string };
type Overview = { users: { customers: number; craftsmen: number; admins: number; approved: number; blocked: number }; requests: { total: number; open: number; completed: number }; activeLocations: number; revenue: { amount: number; currency: string; available: boolean } };
type LocationData = { updatedAt: string; craftsmen: Array<{ id: number; name: string; specialty: string; lat: number; lng: number; updatedAt: string }>; customers: Array<{ id: number; name: string; lat: number; lng: number; status: string; updatedAt: string }> };
type AdminRequest = { id: number; userName: string; categoryName: string; title: string; priority: string; status: string; trackingStatus: string; semt: string; mahalle: string; assignedUstaId: string | null; assignedUsta: { id: number; name: string; specialty: string } | null; createdAt: string; updatedAt: string };

const tokenKey = "usta-cepte-admin-token";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Users }) {
  return <div className="admin-stat-card"><span className="admin-stat-icon"><Icon size={18} /></span><span className="admin-stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

export default function Admin() {
  const [token, setToken] = useState(() => window.localStorage.getItem(tokenKey) ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [locations, setLocations] = useState<LocationData | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [dataError, setDataError] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [selectedSupportSession, setSelectedSupportSession] = useState("");
  const [supportReply, setSupportReply] = useState("");
  const [supportPending, setSupportPending] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setDataError("");
      const dashboard = await getAdminDashboard();
      setOverview(dashboard.overview);
      setUsers(dashboard.users as AdminUser[]);
      setLocations(dashboard.locations);
      setRequests(dashboard.requests);
      setLastRefresh(new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Admin verileri alınamadı.";
      if (message.includes("oturumu") || message.includes("Yönetici")) {
        window.localStorage.removeItem(tokenKey);
        setToken("");
      }
      setDataError(message);
    }
  }, [token]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => { void loadData(); }, 15000);
    return () => window.clearInterval(timer);
  }, [loadData, token]);

  const loadSupportMessages = useCallback(async () => {
    if (!token) return;
    try {
      const messages = await getAdminSupportMessages();
      setSupportMessages(messages);
      setSelectedSupportSession((current) => current || messages[0]?.sessionId || "");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Destek mesajları alınamadı.");
    }
  }, [token]);

  useEffect(() => {
    if (!token || tab !== "support") return;
    void loadSupportMessages();
    const realtime = supabaseChannelForAdminSupport(() => { void loadSupportMessages(); });
    const timer = window.setInterval(() => { void loadSupportMessages(); }, 15000);
    return () => { realtime(); window.clearInterval(timer); };
  }, [loadSupportMessages, tab, token]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setLoginError("");
    try {
      const result = await signInWithPassword(email, password);
      if (result.profile.role !== "admin") {
        await signOut();
        throw new Error("Bu hesap yönetici yetkisine sahip değil.");
      }
      window.localStorage.setItem(tokenKey, "supabase-session");
      setToken("supabase-session");
      setPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Yönetici girişi başarısız.");
    } finally {
      setPending(false);
    }
  };

  const updateUser = async (user: AdminUser, action: "approve" | "reject" | "block" | "unblock") => {
    if (!Number.isInteger(user.id)) return;
    try {
      await updateAdminProfile(String(user.id), action);
      await loadData();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Hesap durumu güncellenemedi.");
    }
  };

  const userGroups = useMemo(() => ({
    customers: users.filter((user) => user.role === "customer"),
    craftsmen: users.filter((user) => user.role === "craftsman"),
  }), [users]);
  const locationRows = useMemo(() => [
    ...(locations?.craftsmen ?? []).map((item) => ({ id: item.id, name: item.name, lat: item.lat, lng: item.lng, kind: "Usta", detail: item.specialty })),
    ...(locations?.customers ?? []).map((item) => ({ id: item.id, name: item.name, lat: item.lat, lng: item.lng, kind: "Talep", detail: item.status })),
  ], [locations]);

  if (!token) {
    return <main className="admin-auth-page"><div className="admin-auth-card"><div className="admin-brand-mark"><ShieldCheck size={22} /></div><span className="admin-eyebrow">USTA CEPTE / YÖNETİCİ</span><h1>Admin Paneli</h1><p>Bu alan yalnızca admin yetkili hesaplara açıktır.</p><form onSubmit={handleLogin}><label>E-posta<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required /></label><label>Şifre<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>{loginError && <div className="admin-error" role="alert">{loginError}</div>}<button className="admin-primary-button" disabled={pending}>{pending ? "Kontrol ediliyor..." : "Yönetici olarak giriş yap"} </button></form></div></main>;
  }

  return <main className="admin-page">
     <header className="admin-topbar"><div><span className="admin-eyebrow">USTA CEPTE / KONTROL MERKEZİ</span><h1>Admin Paneli</h1><p>Hesaplar, hizmet akışı ve canlı saha durumu.</p></div><div className="admin-topbar-actions"><span className="admin-refresh-label">{lastRefresh ? `Son güncelleme ${formatDate(lastRefresh)}` : "Veriler yükleniyor"}</span><button className="admin-icon-button" onClick={() => void loadData()} aria-label="Verileri yenile"><RefreshCw size={17} /></button><button className="admin-icon-button" onClick={() => { void signOut(); window.localStorage.removeItem(tokenKey); setToken(""); }} aria-label="Çıkış yap"><LogOut size={17} /></button></div></header>
     <nav className="admin-tabs" aria-label="Admin bölümleri">{[["overview", "Genel bakış"], ["users", "Hesaplar"], ["locations", "Canlı konum"], ["requests", "Talepler"], ["support", "Canlı Destek & Mesajlar"]].map(([value, label]) => <button key={value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value as AdminTab)}>{label}</button>)}</nav>
    {dataError && <div className="admin-error admin-wide-error" role="alert">{dataError}</div>}
    {tab === "overview" && overview && <section className="admin-content"><div className="admin-stat-grid"><StatCard label="Müşteriler" value={overview.users.customers} detail={`${overview.users.approved} onaylı hesap`} icon={Users} /><StatCard label="Hizmet verenler" value={overview.users.craftsmen} detail={`${overview.activeLocations} çevrimiçi konum`} icon={Activity} /><StatCard label="Açık talepler" value={overview.requests.open} detail={`${overview.requests.total} toplam talep`} icon={Clock3} /><StatCard label="Tamamlanan işler" value={overview.requests.completed} detail="Kalıcı talep kayıtlarından" icon={Check} /><StatCard label="Gelir" value={overview.revenue.available ? `${overview.revenue.amount.toLocaleString("tr-TR")} ${overview.revenue.currency}` : "Veri yok"} detail={overview.revenue.available ? "Başarılı ödeme kayıtları" : "Ödeme kaynağı bağlı değil"} icon={BarChart3} /></div><div className="admin-two-column"><section className="admin-panel-card"><div className="admin-panel-heading"><div><span className="admin-eyebrow">OPERASYON</span><h2>Bugünkü durum</h2></div><button className="admin-text-button" onClick={() => setTab("requests")}>Talepleri gör</button></div><div className="admin-progress-row"><span>Onaylı hesaplar</span><strong>{overview.users.approved} / {users.length || "—"}</strong></div><div className="admin-progress"><i style={{ width: `${users.length ? Math.min(100, overview.users.approved / users.length * 100) : 0}%` }} /></div><div className="admin-mini-grid"><span><b>{overview.users.blocked}</b>Engelli hesap</span><span><b>{overview.requests.open}</b>Açık talep</span><span><b>{overview.activeLocations}</b>Canlı konum</span></div></section><section className="admin-panel-card admin-map-preview"><div className="admin-panel-heading"><div><span className="admin-eyebrow">SAHA</span><h2>Konum akışı</h2></div><button className="admin-text-button" onClick={() => setTab("locations")}>Haritayı aç</button></div><p>{locations?.craftsmen.length ?? 0} hizmet veren ve {locations?.customers.length ?? 0} talep konumu izleniyor. Veriler 15 saniyede bir yenileniyor.</p><div className="admin-map-strip"><MapPinned size={20} /><span>Antalya saha görünümü</span></div></section></div></section>}
    {tab === "users" && <section className="admin-content"><div className="admin-section-heading"><div><span className="admin-eyebrow">KULLANICI YÖNETİMİ</span><h2>Müşteri ve hizmet veren hesapları</h2></div><span className="admin-count-badge">{users.length} kayıt</span></div><div className="admin-user-groups"><UserTable title="Müşteriler" users={userGroups.customers} onAction={updateUser} /><UserTable title="Hizmet verenler" users={userGroups.craftsmen} onAction={updateUser} /></div></section>}
    {tab === "locations" && <section className="admin-content"><div className="admin-section-heading"><div><span className="admin-eyebrow">CANLI SAHA</span><h2>Konum paylaşan hesaplar</h2></div><span className="admin-live-badge"><i /> 15 sn yenileme</span></div><div className="admin-location-layout"><div className="admin-map-frame"><iframe title="Antalya canlı konum haritası" src="https://www.openstreetmap.org/export/embed.html?bbox=30.55%2C36.78%2C30.85%2C36.98&amp;layer=mapnik" /><div className="admin-map-overlay"><MapPinned size={15} /> {locations?.craftsmen.length ?? 0} usta · {locations?.customers.length ?? 0} müşteri konumu</div></div><div className="admin-location-list">{locationRows.map((item) => <div className="admin-location-row" key={`${item.kind}-${item.id}`}><span className={item.kind === "Usta" ? "admin-location-dot is-usta" : "admin-location-dot"} /><div><strong>{item.name}</strong><small>{item.kind} · {item.detail}</small></div><code>{item.lat.toFixed(4)}, {item.lng.toFixed(4)}</code></div>)}{!locationRows.length && <div className="admin-empty">Paylaşılmış aktif konum bulunmuyor.</div>}</div></div></section>}
    {tab === "requests" && <section className="admin-content"><div className="admin-section-heading"><div><span className="admin-eyebrow">OPERASYON</span><h2>Talepler ve eşleşmeler</h2></div><span className="admin-count-badge">{requests.length} talep</span></div><div className="admin-request-list">{requests.map((request) => <article className="admin-request-row" key={request.id}><div className="admin-request-main"><span className={`admin-status-pill ${request.status === "Tamamlandı" ? "is-done" : request.status === "İptal" ? "is-cancelled" : ""}`}>{request.status}</span><h3>{request.title}</h3><p>{request.userName} · {request.categoryName} · {request.semt} / {request.mahalle}</p></div><div className="admin-request-match">{request.assignedUsta ? <><small>Eşleşen usta</small><strong>{request.assignedUsta.name}</strong><span>{request.assignedUsta.specialty}</span></> : <><small>Eşleşme</small><strong>Bekleniyor</strong><span>Uygun hizmet veren aranıyor</span></>}</div><time>{formatDate(request.updatedAt)}</time></article>)}{!requests.length && <div className="admin-empty">Henüz talep bulunmuyor.</div>}</div></section>}
     {tab === "support" && <SupportInbox messages={supportMessages} selectedSession={selectedSupportSession} onSelectSession={setSelectedSupportSession} reply={supportReply} onReplyChange={setSupportReply} pending={supportPending} onSend={async () => { if (!selectedSupportSession || !supportReply.trim() || supportPending) return; setSupportPending(true); try { const sent = await sendAdminSupportMessage(selectedSupportSession, supportReply); setSupportMessages((current) => [...current, sent]); setSupportReply(""); } catch (error) { setDataError(error instanceof Error ? error.message : "Yanıt gönderilemedi."); } finally { setSupportPending(false); } }} />}
  </main>;
}

function supabaseChannelForAdminSupport(onChange: () => void) {
  const channel = supabase
    .channel("admin-support-messages")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

function SupportInbox({ messages, selectedSession, onSelectSession, reply, onReplyChange, pending, onSend }: {
  messages: SupportMessage[];
  selectedSession: string;
  onSelectSession: (sessionId: string) => void;
  reply: string;
  onReplyChange: (value: string) => void;
  pending: boolean;
  onSend: () => Promise<void>;
}) {
  const sessions = Array.from(new Map(messages.map((message) => [message.sessionId, message])).values()).reverse();
  const conversation = messages.filter((message) => message.sessionId === selectedSession);
  return <section className="admin-content"><div className="admin-section-heading"><div><span className="admin-eyebrow">GERÇEK ZAMANLI İLETİŞİM</span><h2>Canlı Destek &amp; Mesajlar</h2></div><span className="admin-count-badge">{sessions.length} konuşma</span></div><div className="admin-support-layout"><div className="admin-support-sessions">{sessions.map((last) => <button type="button" key={last.sessionId} className={`admin-support-session ${last.sessionId === selectedSession ? "is-active" : ""}`} onClick={() => onSelectSession(last.sessionId)}><MessageCircle size={17} /><span><strong>{last.senderName}</strong><small>{last.message}</small></span><time>{formatDate(last.createdAt)}</time></button>)}{!sessions.length && <div className="admin-empty">Henüz destek mesajı bulunmuyor.</div>}</div><div className="admin-support-conversation"><div className="admin-support-conversation-head"><strong>{conversation[0]?.senderName ?? "Konuşma seçin"}</strong><small>{conversation[0]?.email ?? `Oturum: ${selectedSession || "—"}`}</small></div><div className="admin-support-message-list">{conversation.map((message) => <div key={message.id} className={`admin-support-message ${message.isAgent ? "is-agent" : ""}`}><small>{message.senderName} · {formatDate(message.createdAt)}</small><p>{message.message}</p></div>)}{selectedSession && !conversation.length && <div className="admin-empty">Bu konuşmada mesaj yok.</div>}</div><form className="admin-support-compose" onSubmit={(event) => { event.preventDefault(); void onSend(); }}><input value={reply} onChange={(event) => onReplyChange(event.target.value)} placeholder="Yanıtınızı yazın…" disabled={!selectedSession || pending} /><button type="submit" disabled={!selectedSession || !reply.trim() || pending} aria-label="Yanıt gönder">{pending ? <RefreshCw className="admin-spin" size={17} /> : <Send size={17} />}</button></form></div></div></section>;
}

function UserTable({ title, users, onAction }: { title: string; users: AdminUser[]; onAction: (user: AdminUser, action: "approve" | "reject" | "block" | "unblock") => void }) {
  return <section className="admin-panel-card"><div className="admin-panel-heading"><h2>{title}</h2><span className="admin-count-badge">{users.length}</span></div><div className="admin-user-list">{users.map((user) => <div className="admin-user-row" key={user.id}><div className="admin-user-avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="admin-user-info"><strong>{user.name}</strong><span>{user.email ?? user.phone ?? user.specialty ?? "Profil kaydı"}</span></div><span className={`admin-status-pill ${user.isBlocked ? "is-cancelled" : user.isApproved ? "is-done" : ""}`}>{user.isBlocked ? "Engelli" : user.isApproved ? "Onaylı" : "Bekliyor"}</span>{user.email && <div className="admin-user-actions">{!user.isApproved && !user.isBlocked && <button onClick={() => onAction(user, "approve")} aria-label="Onayla"><Check size={15} /></button>}{user.isBlocked ? <button onClick={() => onAction(user, "unblock")} aria-label="Engeli kaldır"><ShieldCheck size={15} /></button> : <button className="is-danger" onClick={() => onAction(user, "block")} aria-label="Engelle"><X size={15} /></button>}</div>}</div>)}{!users.length && <div className="admin-empty">Kayıt bulunmuyor.</div>}</div></section>;
}