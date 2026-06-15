export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<unknown> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Request to ${path} failed with ${String(res.status)}`);
  }

  if (res.status === 204) {
    return null;
  }

  const data: unknown = await res.json();
  return data;
}
