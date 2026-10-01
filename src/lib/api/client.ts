import { getApiBaseUrl } from '../../config/api';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setSession,
} from '../auth/session';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
};

let refreshing: Promise<boolean> | null = null;

async function parseJson(response: Response) {
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) return response.json();
  return null;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const payload = await parseJson(res);
    const data = payload?.data ?? payload;
    const token = data?.token || data?.tokens?.accessToken;
    if (!res.ok || !token) return false;
    await setSession({
      tokens: {
        accessToken: token,
        refreshToken: data.refreshToken || data.tokens?.refreshToken,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function apiClient<T = unknown>(
  path: string,
  options: Options = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth } = options;
  const token = skipAuth ? null : getAccessToken();

  const config: RequestInit = {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body !== undefined) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const url = `${getApiBaseUrl()}${path}`;
  const run = () => fetch(url, config);
  let response: Response;
  let payload: any;
  try {
    response = await run();
    payload = await parseJson(response);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(
      `Cannot reach API at ${getApiBaseUrl()} (${detail}). Check Backend on port 5000 and ANDROID_CONNECTION / adb reverse.`,
      0,
    );
  }

  if (response.status === 401 && !skipAuth) {
    if (!refreshing) refreshing = refreshAccessToken().finally(() => {
      refreshing = null;
    });
    const ok = await refreshing;
    if (ok) {
      const next = getAccessToken();
      (config.headers as Record<string, string>).Authorization = `Bearer ${next}`;
      response = await run();
      payload = await parseJson(response);
    } else {
      await clearSession();
    }
  }

  if (!response.ok) {
    let message =
      payload?.message ||
      payload?.error?.message ||
      `Request failed (${response.status})`;
    if (String(message).toLowerCase().includes('jwt expired')) {
      message = 'Your session has expired. Please log in again.';
    }
    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204) return null as T;
  return (payload?.data ?? payload) as T;
}

export const api = {
  get: <T>(path: string) => apiClient<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiClient<T>(path, { method: 'DELETE' }),
};
