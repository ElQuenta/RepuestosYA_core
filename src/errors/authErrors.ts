import { BaseAppError, ErrorPayload } from "./baseErrors";

export class AuthenticationError extends BaseAppError {
  constructor(message = 'Invalid credentials', payload?: ErrorPayload) {
    super(message, 'AuthenticationError', 401, payload);
  }
}

export class UnauthorizedError extends BaseAppError {
  constructor(message = 'Unauthorized', payload?: ErrorPayload) {
    super(message, 'UnauthorizedError', 403, payload);
  }
}

export class TokenExpiredError extends BaseAppError {
  constructor(message = 'Token expired', payload?: ErrorPayload) {
    super(message, 'TokenExpiredError', 401, payload);
  }
}

export const Errors = {
  AuthenticationError,
  UnauthorizedError,
  TokenExpiredError
};