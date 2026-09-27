import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

type Config = { configured: boolean; provider?: string; amount?: number; vatIncluded?: boolean; error?: string };

export default function Pay() {
  const [location] = useLocation();
  const userId = new URLSearchParams(location.split("?")[1] ?? "").get("user_id") ?? "";
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setConfig({ configured: false, error: "Ödeme için kullanıcı kimliği gerekli." });
      setLoading(false);
      return;
    }
    setConfig({
      configured: false,
      error: "Kart ödeme akışı frontend-only modda etkin değil. Ödeme sağlayıcısı gizli anahtar ve güvenli bir sunucu fonksiyonu gerektirir.",
    });
    setLoading(false);
  }, [userId]);

  return (
    <main className="payment-page">
      <div className="payment-shell">
        <Link href="/" className="payment-back"><ArrowLeft size={16} /> Ana sayfaya dön</Link>
        <div className="payment-icon"><CreditCard size={25} /></div>
        <div className="payment-eyebrow"><ShieldCheck size={14} /> Güvenli ödeme</div>
        <h1>Aylık kullanım aboneliği</h1>
        <p className="payment-subtitle">Usta Cepte hizmetlerini kullanmaya devam etmek için aylık kullanım bedeli.</p>
        <div className="payment-amount"><strong>3.000 TL</strong><span>KDV dahil · 30 gün</span></div>
        {loading ? (
          <div className="payment-state"><Loader2 className="spin" size={20} /> Ödeme seçenekleri hazırlanıyor…</div>
        ) : config?.configured ? (
          <div className="payment-state payment-ready"><CreditCard size={20} /> {config.provider?.toUpperCase()} ödeme ekranı sağlayıcı kurulumu tamamlandığında açılacaktır.</div>
        ) : (
          <div className="payment-state payment-warning"><AlertTriangle size={20} /><span>{config?.error ?? "Kart ödeme sağlayıcısı henüz yapılandırılmadı."}<small>Yönetici, ödeme sağlayıcısı kimlik bilgilerini güvenli ortam ayarlarına eklemelidir.</small></span></div>
        )}
        <div className="payment-security">Kart bilgileriniz Usta Cepte sunucusunda saklanmaz.</div>
      </div>
    </main>
  );
}