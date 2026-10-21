import { HttpException } from '@nestjs/common';

export interface ErrorDetail {
  field?: string;
  issue: string;
}

/** Throw this for expected business errors; the filter renders the SRS 8.7 error contract. */
export class AppException extends HttpException {
  constructor(
    status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[] | Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}
