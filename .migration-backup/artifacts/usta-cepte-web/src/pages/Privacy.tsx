import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { PrivacyContent } from "@/components/PrivacyContent";

export default function Privacy() {
  return (
    <Layout>
      <article className="legal-page">
        <div className="legal-eyebrow">USTA CEPTE</div>
        <h1>Gizlilik Politikası</h1>
        <p className="legal-date">Son Güncelleme: 20 Ağustos 2026</p>
        <PrivacyContent />
        <Link href="/" className="legal-back">Ana sayfaya dön</Link>
      </article>
    </Layout>
  );
}