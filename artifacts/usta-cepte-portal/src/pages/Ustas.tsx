import { Layout } from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import { Star, MapPin, PhoneCall, ShieldCheck, Search, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { listNearbyProviders } from "@/lib/supabase";

type Usta = {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  verified: boolean;
  district?: string;
};

export default function Ustas() {
  const [search, setSearch] = useState("");
  const [service, setService] = useState("Tümü");
  const [district, setDistrict] = useState("Tümü");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [ustas, setUstas] = useState<Usta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void listNearbyProviders()
      .then(({ providers }) => {
        if (active) setUstas(providers.map((provider) => ({ ...provider, verified: true })));
      })
      .catch(() => { if (active) setUstas([]); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const services = useMemo(
    () => ["Tümü", ...Array.from(new Set((ustas ?? []).map((usta) => usta.specialty))).sort()],
    [ustas],
  );
  const districts = useMemo(
    () => [
      "Tümü",
      ...Array.from(
        new Set(
          (ustas ?? [])
            .map((usta) => usta.district)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    ],
    [ustas],
  );
  const filtered = useMemo(
    () =>
      (ustas ?? []).filter((usta) => {
        const query = search.toLocaleLowerCase("tr-TR");
        if (query && !usta.name.toLocaleLowerCase("tr-TR").includes(query) && !usta.specialty.toLocaleLowerCase("tr-TR").includes(query)) return false;
        if (service !== "Tümü" && usta.specialty !== service) return false;
        if (district !== "Tümü" && usta.district !== district) return false;
        return !onlyAvailable || usta.isOnline;
      }),
    [ustas, search, service, district, onlyAvailable],
  );

  return (
    <Layout>
      <div style={{ background: "var(--navy)", padding: "52px 24px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(220,122,46,0.8)", letterSpacing: 1.5, textTransform: "uppercase" }}>Antalya Geneli</span>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginTop: 6, marginBottom: 10, letterSpacing: -0.8 }}>Ustalar</h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", maxWidth: 480, lineHeight: 1.65 }}>
            Kimliği doğrulanmış ustaları inceleyin, talebinizi gönderin ve işinizi canlı takip edin.
          </p>
        </div>
      </div>

      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 68, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "8px 14px", flex: "1 1 200px", minWidth: 160 }}>
            <Search size={15} color="var(--muted)" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Usta adı veya hizmet…" style={{ border: "none", background: "transparent", fontSize: 13.5, color: "var(--text)", flex: 1, outline: "none" }} />
          </div>
          <select value={service} onChange={(event) => setService(event.target.value)} style={selectStyle}>
            {services.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={district} onChange={(event) => setDistrict(event.target.value)} style={selectStyle}>
            {districts.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button onClick={() => setOnlyAvailable((value) => !value)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "1.5px solid", borderColor: onlyAvailable ? "var(--teal)" : "var(--border)", background: onlyAvailable ? "rgba(15,122,99,0.08)" : "var(--bg)", color: onlyAvailable ? "var(--teal)" : "var(--muted)", fontSize: 13.5, fontWeight: 600 }}>
            <CheckCircle2 size={15} /> Sadece Müsait
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginBottom: 20 }}>
          {isLoading ? "Ustalar yükleniyor…" : `${filtered.length} usta bulundu`}
        </div>
        {isLoading ? (
          <div style={emptyStyle}>Usta listesi hazırlanıyor…</div>
        ) : filtered.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>Usta bulunamadı</h2>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>Filtrelerinizi değiştirmeyi deneyin.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {filtered.map((usta) => <UstaCard key={usta.id} usta={usta} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "1.5px solid var(--border)",
  background: "var(--bg)",
  fontSize: 13.5,
  color: "var(--text)",
  fontFamily: "inherit",
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "80px 24px",
  borderRadius: 16,
  background: "var(--surface)",
  border: "1.5px solid var(--border)",
};

function UstaCard({ usta }: { usta: Usta }) {
  const initials = usta.name.split(" ").map((name) => name[0]).join("");
  return (
    <div style={{ background: "var(--surface)", borderRadius: 18, border: "1.5px solid var(--border)", padding: 22, boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: "rgba(27,36,48,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 17, color: "var(--navy)", flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--navy)" }}>{usta.name}</span>
            {usta.verified && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(220,122,46,0.12)", color: "var(--copper)", letterSpacing: 0.3 }}>Doğrulandı</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginTop: 2 }}>{usta.specialty} Ustası</div>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: usta.isOnline ? "rgba(15,122,99,0.1)" : "rgba(100,112,130,0.1)", color: usta.isOnline ? "var(--teal)" : "var(--muted)", flexShrink: 0 }}>{usta.isOnline ? "Müsait" : "Meşgul"}</span>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Stat icon={<Star size={13} color="var(--copper)" fill="var(--copper)" />} label={usta.rating.toFixed(1)} />
        <Stat icon={<ShieldCheck size={13} color="var(--teal)" />} label={usta.verified ? "Doğrulandı" : "Doğrulama bekliyor"} />
        <Stat icon={<MapPin size={13} color="var(--muted)" />} label={usta.district ?? "Antalya"} />
      </div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <Link href="/kayit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 9, background: "var(--copper)", color: "#fff", fontWeight: 700, fontSize: 13.5, fontFamily: "'Space Grotesk',sans-serif" }}>
          <PhoneCall size={14} /> Talep Gönder
        </Link>
      </div>
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 5 }}>{icon}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</span></div>;
}