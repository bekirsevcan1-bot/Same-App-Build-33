import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

const connectors = new ReplitConnectors();

export async function supabaseProxy(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<Response> {
  return connectors.proxy("supabase", path, options);
}

/**
 * Mirror an usta's online/offline status change to Supabase.
 * Only updates the is_online column — does not create a new row.
 * Failures are logged but never propagate to the caller.
 */
export async function syncOnlineStatusToSupabase(ustaId: number, isOnline: boolean) {
  try {
    const res = await supabaseProxy(
      `/rest/v1/usta_locations?usta_id=eq.${ustaId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          is_online: isOnline ? "true" : "false",
          updated_at: new Date().toISOString(),
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      logger.warn(
        { path: "/rest/v1/usta_locations", status: res.status, body: text, ustaId },
        "Supabase online-status sync failed",
      );
    } else {
      logger.debug({ ustaId, isOnline }, "Supabase online status synced");
    }
  } catch (err) {
    logger.warn({ err, ustaId }, "Supabase online-status sync error – continuing with local DB only");
  }
}

export async function syncLocationToSupabase(location: {
  ustaId: number;
  ustaName: string;
  specialty: string;
  categoryId: string;
  lat: number;
  lng: number;
  heading?: number;
  isOnline: string;
}) {
  // Map camelCase fields to snake_case column names expected by usta_locations table
  const payload = {
    usta_id: location.ustaId,
    usta_name: location.ustaName,
    specialty: location.specialty,
    category_id: location.categoryId,
    lat: location.lat,
    lng: location.lng,
    heading: location.heading ?? null,
    is_online: location.isOnline,
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await supabaseProxy("/rest/v1/usta_locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn(
        { path: "/rest/v1/usta_locations", status: res.status, body: text, ustaId: location.ustaId },
        "Supabase sync failed – location not mirrored to Realtime",
      );
    } else {
      logger.debug({ ustaId: location.ustaId }, "Supabase location synced");
    }
  } catch (err) {
    logger.warn({ err, ustaId: location.ustaId }, "Supabase sync error – continuing with local DB only");
  }
}
