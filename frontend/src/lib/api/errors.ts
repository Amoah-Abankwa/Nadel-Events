import axios from 'axios';

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

/** Normalised SRS 8.7 error. Everything the UI shows comes from here. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.filter((d) => d.field).map((d) => [d.field!, d.issue]));
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') return new ApiError(0, 'TIMEOUT', 'The request took too long. Check your connection and try again.');
    if (!err.response) return new ApiError(0, 'NETWORK', 'Can’t reach the shop right now. Check your connection and try again.');
    const body = err.response.data as Partial<{ code: string; message: string; details: ApiErrorDetail[]; requestId: string }> | undefined;
    return new ApiError(
      err.response.status,
      body?.code ?? 'ERROR',
      body?.message ?? 'Something went wrong. Try again in a moment.',
      Array.isArray(body?.details) ? body!.details : [],
      body?.requestId,
    );
  }
  return new ApiError(0, 'UNKNOWN', 'Something went wrong. Try again in a moment.');
}
