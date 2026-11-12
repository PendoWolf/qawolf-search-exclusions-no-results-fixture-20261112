import type { Request } from "express";

// Server-side Pendo Track Events. Posts to the Pendo Track API so counter
// changes are recorded only after the server has applied them.
// PENDO_TRACK_EVENT_SECRET holds the integration key; keep it out of source
// control. When it's unset, tracking is a no-op (local dev, tests).
const PENDO_DATA_HOST = process.env.PENDO_DATA_HOST ?? "data.pendo-dev.pendo-dev.com";
const PENDO_TRACK_EVENT_SECRET = process.env.PENDO_TRACK_EVENT_SECRET;

// The web app sends the Pendo visitor and account IDs with each API call.
const idFromHeader = (req: Request, header: string) => req.get(header)?.trim() || "system";

export async function pendoTrack(
  req: Request,
  event: string,
  properties: Record<string, string | number | boolean> = {}
): Promise<void> {
  if (!PENDO_TRACK_EVENT_SECRET) return;

  try {
    const res = await fetch(`https://${PENDO_DATA_HOST}/data/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pendo-integration-key": PENDO_TRACK_EVENT_SECRET,
      },
      body: JSON.stringify({
        type: "track",
        event,
        visitorId: idFromHeader(req, "x-pendo-visitor-id"),
        accountId: idFromHeader(req, "x-pendo-account-id"),
        timestamp: Date.now(),
        properties,
        context: {
          ip: req.ip,
          userAgent: req.get("user-agent"),
          url: req.get("referer"),
        },
      }),
    });
    if (!res.ok) {
      console.error(`Pendo track "${event}" failed: ${res.status}`);
    }
  } catch (err) {
    // Never let tracking failures break the API.
    console.error(`Pendo track "${event}" failed:`, err);
  }
}
