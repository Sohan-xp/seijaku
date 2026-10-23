import type { CacheTag } from "@/src/lib/cache-tags";

const DEFAULT_BACKEND_URL = "http://localhost:4001";
const DEFAULT_PUBLIC_REVALIDATE_SECONDS = 60;

export function getBackendBaseUrl() {
  return (process.env.BACKEND_INTERNAL_URL ?? DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

export type PublicFetchOptions = RequestInit & {
  revalidate?: number;
  tags?: CacheTag[];
};

export async function backendFetch(path: string, init?: RequestInit) {
  return fetch(`${getBackendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) {
      return data.error;
    }
  } catch {
    const text = await response.text();
    if (text.trim()) {
      return text;
    }
  }
  return `Backend request failed (${response.status})`;
}

export async function backendJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await backendFetch(path, init);

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as T;
}

// Public server-side reads. Cached via Next Data Cache with an explicit tag
// list so admin writes can invalidate on demand (see /api/revalidate). Caller
// can override revalidate or pass tags: [] to opt out of tag invalidation.
export async function publicBackendJson<T>(
  path: string,
  { revalidate, tags, ...init }: PublicFetchOptions = {},
): Promise<T> {
  const isNoStore = init.cache === "no-store" || revalidate === 0;
  const next: { revalidate?: number; tags?: CacheTag[] } = isNoStore
    ? {}
    : { revalidate: revalidate ?? DEFAULT_PUBLIC_REVALIDATE_SECONDS };
  if (!isNoStore && tags && tags.length > 0) {
    next.tags = tags;
  }

  return backendJson<T>(path, { ...init, ...(isNoStore ? {} : { next }) } as RequestInit);
}
