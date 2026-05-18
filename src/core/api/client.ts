import { config } from '../config';
import { getStoredRefreshToken, getStoredUser, setAuth } from '../storage/authStorage';

export type ApiError = { message: string; success?: boolean; status?: number };

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: object;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data?: T; error?: ApiError }> {
  const base = config.API_BASE_URL;
  const url = `${base}${path}`;
  const { body, headers: customHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(customHeaders as Record<string, string>),
  };
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[API] Request:', options.method || 'GET', url);
    }
    const res = await fetch(url, {
      ...rest,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof (json as any)?.message === 'string'
          ? (json as any).message
          : `Request failed (${res.status})`;
      return {
        error: {
          message,
          success: (json as any)?.success,
          status: res.status,
        },
      };
    }
    return { data: json as T };
  } catch (e: any) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[API] Network error:', url, e?.message || e);
    }
    return {
      error: {
        message: e?.message || 'Network error. Please check your connection.',
      },
    };
  }
}

export async function requestWithAuth<T>(
  path: string,
  token: string,
  options: RequestOptions = {}
): Promise<{ data?: T; error?: ApiError }> {
  const result = await request<T>(path, {
    ...options,
    headers: {
      ...(options.headers as object),
      Authorization: `Bearer ${token}`,
    },
  });

  if (result.error?.status === 401 || result.error?.status === 403) {
    const storedRefreshToken = await getStoredRefreshToken();
    if (!storedRefreshToken) return result;

    const base = config.API_BASE_URL;
    try {
      const refreshRes = await fetch(`${base}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });
      const refreshJson = await refreshRes.json().catch(() => ({}));
      if (refreshRes.ok && refreshJson?.success && refreshJson?.token) {
        const newToken: string = refreshJson.token;
        const storedUser = await getStoredUser();
        if (storedUser) await setAuth(newToken, storedUser);
        return request<T>(path, {
          ...options,
          headers: {
            ...(options.headers as object),
            Authorization: `Bearer ${newToken}`,
          },
        });
      }
    } catch {
      // refresh failed, fall through and return original error
    }
  }

  return result;
}

export { request };
