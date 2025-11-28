export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Daily quota exceeded') {
    super(message, 'quota_exceeded', 429);
  }
}

export interface ErrorDetails {
  code: string;
  message: string;
  status: number;
}

export interface ErrorResponse {
  error: ErrorDetails;
}
