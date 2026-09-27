import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { appPath } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setHasSession(Boolean(data.session));
        setCheckingSession(false);
      }
    };
    void checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(Boolean(session));
        setCheckingSession(false);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Yeni şifreniz en az 6 karakter olmalıdır.");
      return;
    }
    if (password !== confirmation) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message || "Şifre güncellenemedi. Yeni bir bağlantı isteyin.");
      return;
    }
    setPassword("");
    setConfirmation("");
    setSaved(true);
    window.setTimeout(() => navigate(appPath("")), 900);
  };

  return (
    <Layout>
      <main className="reset-password-page">
        <section className="reset-password-card" aria-labelledby="reset-password-title">
          <div className="reset-password-icon"><KeyRound size={24} /></div>
          <div className="reset-password-eyebrow"><ShieldCheck size={14} /> GÜVENLİ HESAP İŞLEMİ</div>
          <h1 id="reset-password-title">Yeni şifre belirle</h1>
          <p className="reset-password-intro">Hesabınız için güçlü ve yalnızca sizin bildiğiniz yeni bir şifre oluşturun.</p>
          {checkingSession ? (
            <div className="reset-password-state"><Loader2 className="spin" size={20} /> Güvenli bağlantı kontrol ediliyor…</div>
          ) : saved ? (
            <div className="reset-password-success">
              <CheckCircle2 size={22} />
              <strong>Şifreniz başarıyla güncellendi.</strong>
              <span>Yeni şifrenizle hesabınıza giriş yapabilirsiniz.</span>
              <Link href={appPath("/")} className="reset-password-button">Giriş ekranına dön</Link>
            </div>
          ) : !hasSession ? (
            <div className="reset-password-state reset-password-warning">
              <strong>Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.</strong>
              <span>Giriş ekranına dönüp yeni bir şifre sıfırlama bağlantısı isteyin.</span>
              <Link href={appPath("/")} className="reset-password-button">Ana sayfaya dön</Link>
            </div>
          ) : (
            <form className="reset-password-form" onSubmit={handleSubmit}>
              <label>
                Yeni şifre
                <span className="reset-password-input-wrap">
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </span>
              </label>
              <label>
                Yeni şifre tekrar
                <span className="reset-password-input-wrap">
                  <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type={showConfirmation ? "text" : "password"} autoComplete="new-password" minLength={6} required />
                  <button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Şifreyi gizle" : "Şifreyi göster"}>{showConfirmation ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </span>
              </label>
              <small>En az 6 karakter kullanın. Büyük harf, küçük harf ve rakam eklemeniz önerilir.</small>
              {error && <div className="reset-password-error" role="alert">{error}</div>}
              <button type="submit" className="reset-password-button" disabled={submitting}>
                {submitting ? <><Loader2 className="spin" size={17} /> Kaydediliyor…</> : "Yeni şifreyi kaydet"}
              </button>
            </form>
          )}
        </section>
      </main>
    </Layout>
  );
}