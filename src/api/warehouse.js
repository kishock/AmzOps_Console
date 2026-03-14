import { API_BASE_URL } from "./orders";

export const WAREHOUSE_TASKS_ENDPOINT = `${API_BASE_URL.replace(/\/$/, "")}/warehouse/tasks`;

export async function fetchWarehouseTasks() {
  const response = await fetch(WAREHOUSE_TASKS_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  const data = await response.json();

  return {
    data,
    tasks: extractWarehouseTasks(data),
  };
}

export async function updateWarehouseTaskStatus(taskId, status) {
  const response = await fetch(`${WAREHOUSE_TASKS_ENDPOINT}/${encodeURIComponent(taskId)}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
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

export function extractWarehouseTasks(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.tasks)) {
    return data.tasks;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}
