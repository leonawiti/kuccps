import type {
  ChoicesRequest,
  ChoicesResponse,
  ClassLearnerInput,
  ClassResponse,
  EligibilityRequest,
  EligibilityResponse,
  Meta,
  Mode,
  ProgrammesResponse,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** The API's error body is {detail} or {field: [messages]}; either becomes one readable sentence. */
function messageFrom(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (typeof record.detail === 'string') return record.detail;
    const parts = Object.entries(record).map(([field, value]) => {
      const text = Array.isArray(value) ? value.join(' ') : typeof value === 'string' ? value : JSON.stringify(value);
      return `${field}: ${text}`;
    });
    if (parts.length) return parts.join(' ');
  }
  return `The server answered with an error (${status}).`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { Accept: 'application/json', ...(init.headers ?? {}) } });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* not JSON: handled below */
  }
  if (!response.ok) throw new ApiError(response.status, messageFrom(response.status, body));
  return body as T;
}

function post<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export const getMeta = () => request<Meta>('/api/meta/');

export function searchProgrammes(params: { q?: string; institution?: string; pathway?: string; limit?: number }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return request<ProgrammesResponse>(`/api/programmes/${text ? `?${text}` : ''}`);
}

export const checkEligibility = (body: EligibilityRequest) => post<EligibilityResponse>('/api/eligibility/', body);
export const analyseChoices = (body: ChoicesRequest) => post<ChoicesResponse>('/api/choices/', body);
export const analyseClass = (body: { learners: ClassLearnerInput[]; mode: Mode; fill?: boolean }) =>
  post<ClassResponse>('/api/class/', body);
