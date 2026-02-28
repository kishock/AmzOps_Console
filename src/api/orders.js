export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://amazon-ops-dashboard.onrender.com";

export const ORDERS_ENDPOINT = `${API_BASE_URL.replace(/\/$/, "")}/orders/`;
export const DELETE_ALL_ORDERS_ENDPOINT = `${ORDERS_ENDPOINT}delete-all`;
export const SYNC_SANDBOX_ENDPOINT = `${ORDERS_ENDPOINT}sync-sandbox`;

export function extractOrders(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.orders)) {
    return data.orders;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

export async function fetchOrders() {
  const response = await fetch(ORDERS_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  const data = await response.json();

  return {
    data,
    orders: extractOrders(data),
  };
}

export async function deleteAllOrders() {
  const primaryResult = await requestDeleteAllOrders("POST");

  if (primaryResult.status === 405) {
    const fallbackResult = await requestDeleteAllOrders("DELETE");

    if (!fallbackResult.ok) {
      throw new Error(formatRequestError(fallbackResult.status, fallbackResult.data));
    }

    return {
      status: fallbackResult.status,
      data: fallbackResult.data,
    };
  }

  if (!primaryResult.ok) {
    throw new Error(formatRequestError(primaryResult.status, primaryResult.data));
  }

  return {
    status: primaryResult.status,
    data: primaryResult.data,
  };
}

export async function triggerSandboxOrder(method = "POST") {
  const response = await fetch(SYNC_SANDBOX_ENDPOINT, {
    method,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      `Request failed with ${response.status}: ${
        typeof payload === "string" ? payload : JSON.stringify(payload)
      }`,
    );
  }

  return {
    status: response.status,
    data: payload,
  };
}

async function requestDeleteAllOrders(method) {
  const response = await fetch(DELETE_ALL_ORDERS_ENDPOINT, {
    method,
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return {
    ok: response.ok,
    status: response.status,
    data: payload,
  };
}

function formatRequestError(status, payload) {
  return `Request failed with ${status}: ${
    typeof payload === "string" ? payload : JSON.stringify(payload)
  }`;
}
