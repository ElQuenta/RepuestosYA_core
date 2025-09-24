export interface ErrorPayload {
  [key: string]: unknown;
}

export class BaseAppError extends Error {
  public readonly name: string;
  public readonly statusCode?: number;
  public readonly payload?: ErrorPayload;
  public readonly isOperational: boolean;

  constructor(message?: string, name = 'ApplicationError', statusCode?: number, payload?: ErrorPayload) {
    super(message ?? name);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = name;
    this.statusCode = statusCode;
    this.payload = payload;
    this.isOperational = true;
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends BaseAppError {
  constructor(message = 'Invalid input data', payload?: ErrorPayload) {
    super(message, 'ValidationError', 400, payload);
  }
}

export class BadRequestError extends BaseAppError {
  constructor(message = 'Bad Request', payload?: ErrorPayload) {
    super(message, 'BadRequestError', 400, payload);
  }
}

export class NotFoundError extends BaseAppError {
  constructor(message = 'Resource not found', payload?: ErrorPayload) {
    super(message, 'NotFoundError', 404, payload);
  }
}

export class ConflictError extends BaseAppError {
  constructor(message = 'Resource already exists', payload?: ErrorPayload) {
    super(message, 'ConflictError', 409, payload);
  }
}

export class DatabaseError extends BaseAppError {
  constructor(message = 'Database error', payload?: ErrorPayload) {
    super(message, 'DatabaseError', 500, payload);
  }
}

export class InternalServerError extends BaseAppError {
  constructor(message = 'Unexpected error. Please try again later', payload?: ErrorPayload) {
    super(message, 'InternalServerError', 500, payload);
  }
}

export const Errors = {
  ValidationError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  InternalServerError,
};
