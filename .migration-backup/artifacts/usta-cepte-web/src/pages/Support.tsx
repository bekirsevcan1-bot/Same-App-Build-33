import { Layout } from "@/components/Layout";
import { SupportChat } from "@/components/SupportChat";
import { Headphones, ShieldCheck } from "lucide-react";

export default function Support() {
  return (
    <Layout>
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "52px 24px 80px", width: "100%" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--teal)", fontSize: 12, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase" }}>
            <ShieldCheck size={14} /> Buradayız
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginTop: 8, color: "var(--navy)", letterSpacing: -0.8 }}>
            Canlı Destek
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, marginTop: 8 }}>
            Usta Cepte destek ekibiyle doğrudan görüşün. Mesajlarınıza en kısa sürede yanıt veririz.
          </p>
        </div>

        <div style={{ minHeight: 570, height: "calc(100vh - 280px)", maxHeight: 720, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 20, boxShadow: "var(--shadow-lg)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Chat header */}
          <div style={{ padding: "18px 22px", background: "var(--navy)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Headphones size={21} color="var(--copper)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", fontSize: 15 }}>Usta Cepte Destek</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--teal)" }} /> Genellikle birkaç dakika içinde yanıtlar
              </div>
            </div>
          </div>

          <SupportChat />
        </div>
      </section>
    </Layout>
  );
}