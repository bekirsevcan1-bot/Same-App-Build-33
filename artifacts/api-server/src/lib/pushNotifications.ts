/**
 * Expo Push Notification helpers.
 * Uses the Expo Push API directly — no server SDK required.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
}

/**
 * Send one or more Expo push notifications.
 * Silently logs errors — notification failures should never break the main flow.
 */
export async function sendPushNotifications(
  messages: PushMessage[],
  log?: { error: (...args: unknown[]) => void },
): Promise<boolean> {
  if (messages.length === 0) return true;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log?.error({ status: res.status, body: text }, "Expo push API error");
      return false;
    }
    const result = await res.json().catch(() => null) as { data?: Array<{ status?: string }> } | null;
    return !result?.data?.some((ticket) => ticket.status === "error");
  } catch (err) {
    log?.error({ err }, "Failed to send push notifications");
    return false;
  }
}

/** Turkish status labels for notification copy */
const STATUS_LABELS: Record<string, string> = {
  "Beklemede": "Beklemede",
  "Devam Ediyor": "Devam Ediyor",
  "Tamamlandı": "Tamamlandı",
  "İptal": "İptal edildi",
};

export function statusChangeBody(newStatus: string): string {
  return `Talebinizin durumu güncellendi: ${STATUS_LABELS[newStatus] ?? newStatus}`;
}
