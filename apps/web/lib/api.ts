/**
 * The single path to data.
 *
 * Every authenticated view in the app goes through this client. Keeping one
 * path (rather than mixing server-side fetching with client fetching) is worth
 * more at this size than per-page optimisation, and it means the session
 * cookie handling and the error envelope are defined in exactly one place.
 */

import type { ApiError } from '@remedyo/shared';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiRequestError extends Error {
  readonly status: number;
  /** Field-level validation messages, when the API returned a list. */
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      // The session is an httpOnly cookie, so it only travels if we ask.
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch {
    throw new ApiRequestError(
      0,
      'Could not reach the server. Check that the API is running.',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const error = (payload ?? {}) as ApiError;
    const messages = Array.isArray(error.message)
      ? error.message
      : [error.message ?? 'Something went wrong.'];
    throw new ApiRequestError(response.status, messages[0], messages);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
