const PULSEIQ_PROJECT_ID = "6ae34409082e447830241e5b";
const PULSEIQ_ENDPOINT = "https://pulseiq-ffio.onrender.com/api/ingest/event";
let warnedMissingApiKey = false;

export const isPulseIQConfigured = () => {
  const apiKey = process.env.PULSEIQ_API_KEY?.trim();
  return Boolean(apiKey && apiKey !== "YOUR_API_KEY");
};

export async function track(eventName, userId = null, properties = {}, anonymousId = "server_event") {
  const apiKey = process.env.PULSEIQ_API_KEY?.trim();
  if (!apiKey || apiKey === "YOUR_API_KEY") {
    if (!warnedMissingApiKey) {
      console.warn("[PulseIQ] PULSEIQ_API_KEY is not configured; events will not be sent.");
      warnedMissingApiKey = true;
    }
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(PULSEIQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        projectId: PULSEIQ_PROJECT_ID,
        eventName,
        userId: userId || undefined,
        anonymousId: anonymousId || "server_event",
        properties,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`[PulseIQ] Event "${eventName}" rejected with HTTP ${response.status}.`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[PulseIQ] Failed to send event "${eventName}".`, error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
