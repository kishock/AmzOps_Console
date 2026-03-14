import { API_BASE_URL } from "./orders";

const INVENTORY_BASE = `${API_BASE_URL.replace(/\/$/, "")}/inventory/`;

export const INVENTORY_ENDPOINT = INVENTORY_BASE;
export const INVENTORY_ADJUSTMENT_ENDPOINTS = [
  `${API_BASE_URL.replace(/\/$/, "")}/inventory/adjust`,
];
export const INVENTORY_LEDGER_ENDPOINT = `${API_BASE_URL.replace(/\/$/, "")}/inventory/transactions`;

export async function fetchInventory() {
  const response = await fetch(INVENTORY_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  const data = await response.json();

  return {
    data,
    inventory: extractInventory(data),
  };
}

export async function fetchInventoryLedger(sku) {
  const query = new URLSearchParams({
    sku: String(sku || "").trim(),
    limit: "100",
  });
  const url = `${INVENTORY_LEDGER_ENDPOINT}?${query.toString()}`;
  const response = await fetchJson(url);

  return {
    endpoint: response.url,
    status: response.status,
    data: response.data,
    ledger: extractInventoryLedger(response.data),
  };
}

export async function submitInventoryAdjustment(payload) {
  return requestFirstSuccessfulJson(INVENTORY_ADJUSTMENT_ENDPOINTS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function extractInventory(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.inventory)) {
    return data.inventory;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

export function extractInventoryLedger(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.transactions)) {
    return data.transactions;
  }

  if (Array.isArray(data?.ledger)) {
    return data.ledger;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

async function fetchJson(url) {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(formatRequestError(response.status, payload));
  }

  return {
    url,
    status: response.status,
    data: payload,
  };
}

async function requestFirstSuccessfulJson(urls, options) {
  let lastError;

  for (const url of urls) {
    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        lastError = new Error(formatRequestError(response.status, payload));
        continue;
      }

      return {
        endpoint: url,
        status: response.status,
        data: payload,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error("Inventory request failed.");
}

function formatRequestError(status, payload) {
  return `Request failed with ${status}: ${
    typeof payload === "string" ? payload : JSON.stringify(payload)
  }`;
}



