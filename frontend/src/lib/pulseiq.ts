import { apiBaseUrl } from "@/integrations/supabase/client";

type PulseIQProperties = Record<string, unknown>;

const createAnonymousId = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getAnonymousId = () => {
  try {
    const existingId = localStorage.getItem("pulseiq_anonymous_id");
    if (existingId) return existingId;

    const anonymousId = createAnonymousId();
    localStorage.setItem("pulseiq_anonymous_id", anonymousId);
    return anonymousId;
  } catch {
    return createAnonymousId();
  }
};

export const trackPulseIQ = async (
  eventName: string,
  userId: string | null = null,
  properties: PulseIQProperties = {},
) => {
  try {
    const response = await fetch(`${apiBaseUrl}/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        userId,
        anonymousId: getAnonymousId(),
        properties,
      }),
    });

    if (!response.ok) {
      console.warn(`[PulseIQ] Event "${eventName}" was not accepted (HTTP ${response.status}).`);
    }
  } catch (error) {
    console.warn(`[PulseIQ] Could not send event "${eventName}".`, error);
  }
};
