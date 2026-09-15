import type {
  Detection,
  DetectionsResponse,
  LicenseStatus,
  OverviewResponse,
  Pin,
  PinDetail,
  PinListResponse,
  Plan,
  Share,
  User,
} from './types';

/** Typed fetch wrapper — always same-origin (Vite proxies /api in development). */

export class ApiError extends Error {
  status: number;
  code: string;
  payload: Record<string, unknown>;

  constructor(message: string, status: number, code = 'ERROR', payload: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    const payload = (data ?? {}) as Record<string, unknown>;
    throw new ApiError(String(payload.error || response.statusText), response.status, String(payload.code || 'ERROR'), payload);
  }

  return data as T;
}

export interface SessionResponse {
  user: User;
  license: LicenseStatus;
}

export const api = {
  /* -------------------------------- auth -------------------------------- */
  me: () => request<SessionResponse>('GET', '/auth/me'),
  login: (email: string, password: string) => request<SessionResponse>('POST', '/auth/login', { email, password }),
  register: (email: string, username: string, password: string) =>
    request<SessionResponse>('POST', '/auth/register', { email, username, password }),
  logout: () => request<{ ok: boolean }>('POST', '/auth/logout'),

  /* -------------------------------- meta -------------------------------- */
  meta: () => request<{ product: string; version: string; games: string[]; plans: Plan[]; simulation: boolean }>('GET', '/meta'),

  /* -------------------------------- pins -------------------------------- */
  pins: {
    list: (params: {
      status?: string;
      game?: string;
      q?: string;
      page?: number;
      perPage?: number;
      shared?: boolean;
    }) => {
      const search = new URLSearchParams();
      if (params.status && params.status !== 'all') search.set('status', params.status);
      if (params.game && params.game !== 'all') search.set('game', params.game);
      if (params.q) search.set('q', params.q);
      if (params.page) search.set('page', String(params.page));
      if (params.perPage) search.set('perPage', String(params.perPage));
      if (params.shared) search.set('shared', '1');
      const query = search.toString();
      return request<PinListResponse>('GET', `/pins${query ? `?${query}` : ''}`);
    },
    get: (code: string) => request<{ pin: PinDetail; canEdit: boolean }>('GET', `/pins/${code}`),
    create: (payload: { player: string; game: string; name?: string; visibility?: 'private' | 'public' }) =>
      request<{ pin: Pin; downloadUrl: string; license: LicenseStatus }>('POST', '/pins', payload),
    update: (code: string, payload: Partial<Pick<Pin, 'name' | 'player' | 'game' | 'visibility' | 'notes'>>) =>
      request<{ pin: PinDetail }>('PATCH', `/pins/${code}`, payload),
    remove: (code: string) => request<{ ok: boolean }>('DELETE', `/pins/${code}`),
    share: (code: string, email: string, access: 'view' | 'full' = 'view') =>
      request<{ share: Share; shares: Share[] }>('POST', `/pins/${code}/share`, { email, access }),
    unshare: (code: string, email: string) => request<{ shares: Share[] }>('DELETE', `/pins/${code}/share/${encodeURIComponent(email)}`),
    simulate: (code: string) => request<{ pin: PinDetail; step: string }>('POST', `/pins/${code}/simulate`, {}),
  },

  /* ------------------------------ license ------------------------------- */
  license: {
    status: () =>
      request<{ license: LicenseStatus; plans: Plan[]; pinsThisMonth: number; history: { key: string; plan: string; status: string; activatedAt: number | null; expiresAt: number | null; lifetime: boolean }[] }>(
        'GET',
        '/license',
      ),
    activate: (key: string) =>
      request<{ license: LicenseStatus; alreadyActive: boolean; message: string }>('POST', '/license/activate', { key }),
  },

  /* ------------------------------- stats -------------------------------- */
  stats: {
    overview: () => request<OverviewResponse>('GET', '/stats/overview'),
    detections: (severity = 'all', limit = 50) =>
      request<DetectionsResponse>('GET', `/stats/detections?severity=${severity}&limit=${limit}`),
  },

  /* ------------------------------- admin -------------------------------- */
  admin: {
    licenses: (status = 'all') =>
      request<{
        items: { id: number; key: string; plan: string; planLabel: string; status: string; note: string | null; createdAt: number; activatedAt: number | null; expiresAt: number | null; lifetime: boolean }[];
        plans: { id: string; label: string }[];
        summary: { plan: string; status: string; c: number }[];
      }>('GET', `/admin/licenses?status=${status}`),
    mint: (plan: string, count: number, note?: string) =>
      request<{ created: { key: string; plan: string; id: number }[] }>('POST', '/admin/licenses', { plan, count, note }),
    revoke: (key: string) => request<{ ok: boolean }>('POST', `/admin/licenses/${encodeURIComponent(key)}/revoke`, {}),
    overview: () => request<{ users: number; pins: number; finished: number; cheating: number; activeLicenses: number }>('GET', '/admin/overview'),
  },
};

export type { Detection, Plan, Pin, PinDetail };
