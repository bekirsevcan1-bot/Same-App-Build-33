import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/ustalar", label: "Ustalar" },
  { href: "/kayit", label: "Kayıt Ol" },
  { href: "/destek", label: "Destek" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: 68 }}>{children}</main>
      <Footer />
    </div>
  );
}

function Navbar() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 68,
      background: scrolled ? "rgba(246,243,236,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(14px)" : "none",
      borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      transition: "background 0.3s, border-color 0.3s",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--copper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 13, color: "#fff", letterSpacing: -0.5 }}>
            UC
          </div>
           <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: "var(--navy)", letterSpacing: -0.4 }}>Usta Cepte</span>
        </Link>

        {/* Desktop nav */}
        <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {NAV.map(({ href, label }) => {
            const active = location === href;
            return (
              <Link key={href} href={href} style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                color: active ? "var(--copper)" : "var(--muted)",
                background: active ? "rgba(220,122,46,0.1)" : "transparent",
                transition: "all 0.15s",
              }}>
                {label}
              </Link>
            );
          })}
          <Link href="/kayit" style={{ marginLeft: 8, padding: "8px 20px", borderRadius: 8, background: "var(--navy)", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>
            Başla
          </Link>
        </nav>
        <button
          className="mobile-nav-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={open}
          style={{ width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", color: "var(--navy)" }}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="mobile-nav-panel" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: "12px 24px 18px" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 1100, margin: "0 auto" }}>
            {NAV.map(({ href, label }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  style={{ padding: "11px 12px", borderRadius: 9, fontSize: 14, fontWeight: 700, color: active ? "var(--copper)" : "var(--navy)", background: active ? "rgba(220,122,46,0.1)" : "transparent" }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer style={{ background: "var(--navy)", color: "#fff", padding: "48px 24px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between", marginBottom: 40 }}>
          {/* Brand */}
          <div style={{ maxWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--copper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 12, color: "#fff" }}>UC</div>
               <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16 }}>Usta Cepte</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>
              Antalya'ya özel, kimliği doğrulanmış ustalarla anlık bağlanın. Güvenli, hızlı, şeffaf.
            </p>
          </div>
          {/* Links */}
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <FooterCol title="Platform" links={[{ href: "/ustalar", label: "Ustalar" }, { href: "/kayit", label: "Kayıt Ol" }, { href: "/destek", label: "Destek" }]} />
            <FooterCol title="Şirket" links={[{ href: "#", label: "Hakkımızda" }, { href: "/gizlilik", label: "KVKK ve Gizlilik" }]} />
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
           <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>© 2026 Usta Cepte. Tüm hakları saklıdır.</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Antalya, Türkiye</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map(({ href, label }) => (
          <Link key={`${href}-${label}`} href={href} style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", transition: "color 0.15s" }}>{label}</Link>
        ))}
      </div>
    </div>
  );
}
