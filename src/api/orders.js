const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://amazon-ops-dashboard.onrender.com";

export const ORDERS_ENDPOINT = `${API_BASE_URL.replace(/\/$/, "")}/orders/`;

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
