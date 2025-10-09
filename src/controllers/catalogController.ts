import { Request, Response } from "express";
import { CatalogByEnterpriseResult, ProductCatalogItemDTO } from '../dtos/catalogDTOs';
import * as CatalogService from '../services/catalogService';
import { handleError } from '../handlers/errorHandler';
import { sendSuccess } from "../handlers/successHandler";
import { NotFoundError } from "../errors/commonErrors";

export const get_catalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const catalog = await CatalogService.get_catalog();
    sendSuccess(res, catalog, "Catalog fetched successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
}
export const get_catalog_by_id = async (req: Request, res: Response): Promise<void> => {
  const productId = Number(req.params.id);
  try {
    const catalogItem = await CatalogService.get_catalog_by_id(productId);
    if (!catalogItem) {
      throw new NotFoundError(`Catalog item with ID ${productId} not found`);
    }
    sendSuccess(res, catalogItem, "Catalog item fetched successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
}

export const get_catalog_by_category = async (req: Request, res: Response): Promise<void> => {
  const categoryId = Number(req.params.categoryId);
  try {
    const catalogItems = await CatalogService.get_catalog_by_category(categoryId);
    sendSuccess(res, catalogItems, "Catalog items fetched successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
}

export const get_catalog_n_by_category = async (req: Request, res: Response): Promise<void> => {
  const categoryId = Number(req.params.categoryId);
  const n = Number(req.params.n);
  try {
    const catalogItems = await CatalogService.get_catalog_n_by_category(categoryId, n);
    sendSuccess(res, catalogItems, "Catalog items fetched successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
}

export const get_catalog_by_enterprise = async (req: Request, res: Response): Promise<void> => {
  const enterpriseId = Number(req.params.enterpriseId);
  try {
    const catalog = await CatalogService.get_catalog_by_enterprise(enterpriseId);
    sendSuccess(res, catalog, "Catalog fetched successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
}
