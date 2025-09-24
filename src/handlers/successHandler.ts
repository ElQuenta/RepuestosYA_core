import { Response } from 'express';

export const sendSuccess = <T = unknown>(res: Response, data: T, message = 'OK') => {
  return res.status(200).json({
    success: true,
    data,
    message,
    error: null,
    code: 200,
  });
};

export const sendCreated = <T = unknown>(res: Response, data: T, message = 'Created') => {
  return res.status(201).json({
    success: true,
    data,
    message,
    error: null,
    code: 201,
  });
};

export const sendNoContent = (res: Response) => {
  return res.status(204).send();
};

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const sendList = <T = unknown>(
  res: Response,
  items: T[],
  meta: PaginationMeta,
  message = 'List retrieved'
) => {
  return res.status(200).json({
    success: true,
    data: items,
    meta,
    message,
    error: null,
    code: 200,
  });
};
