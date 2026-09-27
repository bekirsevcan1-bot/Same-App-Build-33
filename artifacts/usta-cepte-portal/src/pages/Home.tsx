import AppDemo from "@/components/AppDemo";

/**
 * The web route intentionally opens straight into the customer application,
 * rather than a marketing/landing page. AppDemo owns the mobile-first
 * navigation and request-creation flow.
 */
export default function Home() {
  return (
    <main style={{ width: "100%", height: "100vh", minHeight: "100vh", background: "#F6F3EC" }}>
      <AppDemo />
    </main>
  );
}