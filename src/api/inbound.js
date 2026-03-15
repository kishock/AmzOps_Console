import { API_BASE_URL } from "./orders";

const INBOUND_BASE = `${API_BASE_URL.replace(/\/$/, "")}/inbounds`;

export const INBOUND_LIST_ENDPOINT = `${INBOUND_BASE}`;

export async function fetchInboundList() {
  const response = await fetch(INBOUND_LIST_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  const data = await response.json();

  return {
    data,
    inbounds: extractInboundList(data),
  };
}

export async function fetchInboundDetail(inboundId) {
  return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}`, {
    method: "GET",
  });
}

export async function createInbound(payload) {
  return requestJson(INBOUND_LIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}


export async function updateInbound(inboundId, payload) {
  return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteInbound(inboundId) {
  return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}`, {
    method: "DELETE",
  });
}
export async function updateInboundStatus(inboundId, status) {
  if (status === "ARRIVED") {
    return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}/arrive`, {
      method: "POST",
    });
  }

  if (status === "CHECKING") {
    return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}/start-checking`, {
      method: "POST",
    });
  }

  try {
    return await requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    if (!(error instanceof Error) || (!error.message.includes("404") && !error.message.includes("405"))) {
      throw error;
    }

    return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
  }
}

export async function submitInboundChecking(inboundId, payload) {
  return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}/receiving`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function confirmInboundChecking(inboundId) {
  return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}/confirm-checking`, {
    method: "POST",
  });
}

export async function submitInboundPutaway(inboundId, payload) {
  return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}/putaway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function completeInbound(inboundId) {
  return requestJson(`${INBOUND_BASE}/${encodeURIComponent(inboundId)}/complete`, {
    method: "POST",
  });
}

export function extractInboundList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.inbounds)) {
    return data.inbounds;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(formatRequestError(response.status, payload));
  }

  return {
    status: response.status,
    data: payload,
  };
}

function formatRequestError(status, payload) {
  return `Request failed with ${status}: ${
    typeof payload === "string" ? payload : JSON.stringify(payload)
  }`;
}









