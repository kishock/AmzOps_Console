import { API_BASE_URL } from "./orders";

export const HEALTH_ENDPOINT = `${API_BASE_URL.replace(/\/$/, "")}/health`;

export async function fetchHealthStatus() {
  const startedAt = performance.now();
  const response = await fetch(HEALTH_ENDPOINT);
  const durationMs = Math.round(performance.now() - startedAt);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      `Health check failed with ${response.status}: ${
        typeof payload === "string" ? payload : JSON.stringify(payload)
      }`,
    );
  }

  return {
    status: response.status,
    durationMs,
    checkedAt: new Date().toISOString(),
    data: payload,
  };
}
