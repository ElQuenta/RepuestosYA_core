import { Request, Response } from "express";
import * as ProductService from '../services/productService';
import { CreateProductDTO, UpdateProductDTO } from "../dtos/productDTOs";
import { handleError } from "../handlers/errorHandler";
import { sendCreated, sendNoContent, sendSuccess } from "../handlers/successHandler";

export const create_product = async (req: Request, res: Response): Promise<void> => {
  try {
    const productData: CreateProductDTO = req.body;
    const result = await ProductService.create_product(productData);
    sendCreated(res, result, "Product created successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const update_product = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const productData: UpdateProductDTO = req.body;
    const result = await ProductService.update_product({ ...productData, id });
    sendSuccess(res, result, "Product updated successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const delete_product = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await ProductService.delete_product(id);
    sendNoContent(res, "Product deleted successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const add_product_image = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const { image_url } = req.body;
    const result = await ProductService.add_product_image(product_id, image_url);
    sendNoContent(res, "Product image added successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const remove_product_image = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const image_id = parseInt(req.params.imageId, 10);
    const result = await ProductService.remove_product_image(image_id, product_id);
    sendNoContent(res, "Product image removed successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const add_product_category = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const { category_id } = req.body;
    const result = await ProductService.add_product_category(product_id, category_id);
    sendNoContent(res, "Product category added successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const remove_product_category = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const category_id = parseInt(req.params.categoryId, 10);
    const result = await ProductService.remove_product_category(product_id, category_id);
    sendNoContent(res, "Product category removed successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const add_product_car_model = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const { car_model_id } = req.body;
    if (isNaN(product_id) || !car_model_id) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const result = await ProductService.add_product_car_model(product_id, car_model_id);
    res.status(204).json(result);
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const remove_product_car_model = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const car_model_id = parseInt(req.params.carModelId, 10);
    const result = await ProductService.remove_product_car_model(product_id, car_model_id);
    sendNoContent(res, "Product car model removed successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};