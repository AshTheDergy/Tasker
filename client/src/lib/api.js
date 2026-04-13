function getStoredUser() {
  try {
    const raw = localStorage.getItem("tasker_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let _isOnline      = true;
let _isServerUp    = true;
let _onApiFailure  = null;

export function setConnectionStatus(isOnline, isServerUp) {
  _isOnline   = isOnline;
  _isServerUp = isServerUp;
}

export function setApiFailureCallback(cb) {
  _onApiFailure = cb;
}

export class ApiError extends Error {
  constructor(status, data) {
    const message =
      (data && typeof data === "object" && data.error) || `HTTP ${status}`;
    super(message);
    this.name     = "ApiError";
    this.status   = status;
    this.data     = data;
    this.isOffline = status === 0;
  }
}

export async function apiFetch(url, { body, headers: extraHeaders, ...rest } = {}) {
  const user = getStoredUser();
  const headers = { "X-User-Id": user?.id ?? "", ...extraHeaders };

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  if (!navigator.onLine) {
    _onApiFailure?.();
    throw new ApiError(0, { error: "No internet connection" });
  }

  let response;
  try {
    response = await fetch(url, {
      method: rest.method ?? (body ? "POST" : "GET"),
      headers,
      ...rest,
      ...(body !== undefined && {
        body: isFormData ? body : JSON.stringify(body),
      }),
    });
  } catch {
    _onApiFailure?.();
    throw new ApiError(0, { error: "No internet connection" });
  }

  let data;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

export const apiGet    = (url, opts)       => apiFetch(url, { ...opts, method: "GET" });
export const apiPost   = (url, body, opts) => apiFetch(url, { ...opts, method: "POST",  body });
export const apiPut    = (url, body, opts) => apiFetch(url, { ...opts, method: "PUT",   body });
export const apiDelete = (url, opts)       => apiFetch(url, { ...opts, method: "DELETE" });