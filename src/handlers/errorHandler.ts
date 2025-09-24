// src/handlers/errorHandler.ts
import { NextFunction, Request, Response } from 'express';
import {
  BaseAppError,
  NotFoundError,
  ValidationError,
  BadRequestError,
  ConflictError,
  InternalServerError,
} from '../errors/baseErrors';

import {AuthenticationError} from '../errors/authErrors';

const errorMap: Record<string, { error: string; code: number }> = {
  AuthenticationError: { error: 'Invalid credentials', code: 401 },
  UnauthorizedError: { error: 'Unauthorized', code: 403 },
  TokenExpiredError: { error: 'Token expired', code: 401 },
  NotFoundError: { error: 'No data available', code: 404 },
  ValidationError: { error: 'Invalid input data', code: 400 },
  BadRequestError: { error: 'Bad Request', code: 400 },
  ConflictError: { error: 'Resource already exists', code: 409 },
  DatabaseError: { error: 'Database error', code: 500 },
  InternalServerError: { error: 'Unexpected error. Please try again later', code: 500 },
};

export const handleErrorResponse = (res: Response, error: Error) => {
  const mapped = errorMap[error.name] ?? { error: 'Unexpected error. Please try again later', code: 500 };

  const isAppError = error instanceof BaseAppError;
  const status = (error as BaseAppError).statusCode ?? mapped.code;
  const payload = (isAppError && (error as BaseAppError).payload) ?? null;

  const responseBody: Record<string, unknown> = {
    success: false,
    data: null,
    message: error.message || mapped.error,
    error: mapped.error,
    code: status,
  };

  if (payload) responseBody.payload = payload;

  if (process.env.NODE_ENV !== 'production') {
    (responseBody as any).stack = (error as any).stack;
  }

  return res.status(status).json(responseBody);
};

export const globalErrorHandler = (
  err: Error,
  res: Response,
) => {
  if (!(err instanceof BaseAppError)) {
    const wrapped = new InternalServerError(err.message);
    if (process.env.NODE_ENV !== 'production') {
      (wrapped as any).stack = (err as any).stack;
    }
    return handleErrorResponse(res, wrapped);
  }

  return handleErrorResponse(res, err);
};
