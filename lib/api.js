function getBrowserBackendUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:3001";
  }

  // Same-origin relative path (proxied by Next.js rewrites in next.config.js)
  return "";
}

export const API_URL = getBrowserBackendUrl();
export const SOCKET_URL = API_URL || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3001");
export const DASHBOARD_API_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_API_TOKEN || "";

export async function apiRequest(path, options = {}) {
  const { timeoutMs = 12000, headers, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {})
      },
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === "AbortError") {
      throw new Error(`Request timed out for ${path}`);
    }

    throw error;
  }

  clearTimeout(timeout);

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Request failed for ${path}`);
  }

  return payload;
}
