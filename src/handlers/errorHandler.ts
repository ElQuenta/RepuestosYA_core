import { Response } from 'express';

interface ErrorResponse {
  error: string;
  code: number;
}

const errorMap: Record<string, ErrorResponse> = {
  AuthenticationError: {
    error: 'Invalid credentials',
    code: 401,
  },
  NotFoundError: { error: 'No data available', code: 404 },
  ValidationError: { error: 'Invalid input data', code: 400 },
  BadRequestError: { error: 'Bad Request', code: 400 },
  ConflictError: { error: 'Resource already exists', code: 409 },
  DefaultError: { error: 'Unexpected error. Please try again later', code: 500 },
};

export const handleError = (res: Response, error: Error) => {
  const errorResponse = errorMap[error.name] || errorMap['DefaultError'];
  res.status(errorResponse.code).json({
    success: false,
    data: null,
    message: error.message,
    error: errorResponse.error,
    code: errorResponse.code,
  });
};