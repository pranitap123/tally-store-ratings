export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details ?? {};
  }
}

let onUnauthenticated = () => {};
export const setUnauthenticatedHandler = (fn) => (onUnauthenticated = fn);

async function request(method, path, { body, params, signal } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return { data: null };
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const e = json.error ?? {};
    // a dead session mid-use should bounce to login; wrong credentials on /auth/login should not
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') onUnauthenticated();
    throw new ApiError(res.status, e.code ?? 'ERROR', e.message ?? 'Something went wrong', e.details);
  }
  return json;
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
};
