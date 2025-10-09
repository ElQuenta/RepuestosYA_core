import { Request, Response } from 'express';

import * as DetailsService from '../services/productDetailsService';
import { handleError } from '../handlers/errorHandler';
import { sendSuccess, sendCreated, sendNoContent } from '../handlers/successHandler';

export const create_car_model = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const newCarModel = await DetailsService.create_car_model(name);
    sendCreated(res, newCarModel, "Car model created successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const create_brand = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const newBrand = await DetailsService.create_brand(name);
    sendCreated(res, newBrand, "Brand created successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};
export const fetch_car_models = async (req: Request, res: Response) => {
  try {
    const carModels = await DetailsService.fetch_car_models();
    sendSuccess(res, carModels, "Car models fetched successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const fetch_brands = async (req: Request, res: Response) => {
  try {
    const brands = await DetailsService.fetch_brands();
    sendSuccess(res, brands, "Brands fetched successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const remove_car_model = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DetailsService.remove_car_model(Number(id));
    sendNoContent(res, "Car model removed successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const remove_brand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DetailsService.remove_brand(Number(id));
    sendNoContent(res, "Brand removed successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};
