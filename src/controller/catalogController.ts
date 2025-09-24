import { Request, Response } from "express";
import * as CatalogService from "../services/catalogService";
import { globalErrorHandler } from "../handlers/errorHandler";
import { sendSuccess, sendList, sendNoContent } from "../handlers/successHandler";
import { InternalServerError } from "../errors/baseErrors";

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await CatalogService.getAllProducts();
    if (products.length === 0) {
      return sendNoContent(res);
    }
    return sendList(res, products, {
      page: 1,
      pageSize: products.length,
      total: 0,
      totalPages: 1
    });
  } catch (error) {
    if (error instanceof Error) {
      return globalErrorHandler(error, res);
    }
    return globalErrorHandler(new InternalServerError("Unknown error"), res);
  }
};

export const getProductByID = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const product = await CatalogService.getProductByID(productId);
    if (!product) {
      return sendNoContent(res);
    }
    return sendSuccess(res, product);
  } catch (error) {
    if (error instanceof Error) {
      return globalErrorHandler(error, res);
    }
    return globalErrorHandler(new InternalServerError("Unknown error"), res);
  }
};

export const getAllProductByStoreID = async (req: Request, res: Response) => {
  try {
    const storeId = req.params.storeId;
    const products = await CatalogService.getAllProductByStoreID(storeId);
    if (products.length === 0) {
      return sendNoContent(res);
    }
    return sendList(res, products, {
      page: 1,
      pageSize: products.length,
      total: 0,
      totalPages: 1
    });
  } catch (error) {
    if (error instanceof Error) {
      return globalErrorHandler(error, res);
    }
    return globalErrorHandler(new InternalServerError("Unknown error"), res);
  }
};

export const getNProductsByCategoryId = async (req: Request, res: Response) => {
  try {
    const categoryId = req.params.categoryId;
    const limit = req.params.limit;
    const products = await CatalogService.getNProductByCategoryID(categoryId, Number(limit));
    if (products.length === 0) {
      return sendNoContent(res);
    }
    return sendList(res, products, {
      page: 1,
      pageSize: products.length,
      total: 0,
      totalPages: 1
    });
  } catch (error) {
    if (error instanceof Error) {
      return globalErrorHandler(error, res);
    }
    return globalErrorHandler(new InternalServerError("Unknown error"), res);
  }
};

export const getAllProductsByCategoryId = async (req: Request, res: Response) => {
  try {
    const categoryId = req.params.categoryId;
    const products = await CatalogService.getAllProductByCategoryID(categoryId);
    if (products.length === 0) {
      return sendNoContent(res);
    }
    return sendList(res, products, {
      page: 1,
      pageSize: products.length,
      total: 0,
      totalPages: 1
    });
  } catch (error) {
    if (error instanceof Error) {
      return globalErrorHandler(error, res);
    }
    return globalErrorHandler(new InternalServerError("Unknown error"), res);
  }
};