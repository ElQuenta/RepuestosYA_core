import { Request, Response } from 'express';

import * as SaveService from '../services/saveService';
import { sendCreated, sendNoContent, sendSuccess } from '../handlers/successHandler';
import { handleError } from '../handlers/errorHandler';

export const save_product = async (req: Request, res: Response) => {
  const accountId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  try {
    const result = await SaveService.save_product(accountId, itemId);
    sendCreated(res, result, "Item saved successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const unsave_product = async (req: Request, res: Response) => {
  const accountId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  try {
    await SaveService.unsave_product(accountId, itemId);
    sendNoContent(res, "Item unsaved successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const get_saved_products = async (req: Request, res: Response) => {
  const accountId = Number(req.params.id);
  try {
    const savedProducts = await SaveService.get_saved_products(accountId);
    sendSuccess(res, savedProducts, "Saved products retrieved successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};
