import { Link } from "wouter";
import { ArrowLeft, Compass, Wrench } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div style={{ width: 76, height: 76, margin: "0 auto 22px", borderRadius: 24, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Wrench size={31} color="var(--copper)" strokeWidth={1.8} />
          <div style={{ position: "absolute", right: -8, bottom: -7, width: 30, height: 30, borderRadius: 10, background: "var(--copper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Compass size={16} color="#fff" />
          </div>
        </div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 72, lineHeight: 1, fontWeight: 800, color: "var(--copper)", letterSpacing: -4 }}>404</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)", marginTop: 12, marginBottom: 10 }}>Bu sayfa bulunamadı</h1>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65, marginBottom: 26 }}>
          Aradığınız sayfa taşınmış veya artık mevcut değil. Ana sayfaya dönüp tekrar deneyebilirsiniz.
        </p>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 10, background: "var(--navy)", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>
          <ArrowLeft size={16} /> Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}