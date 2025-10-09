import { Request, Response } from "express";
import * as ProductService from '../services/productService';
import { CreateProductDTO, UpdateProductDTO } from "../dtos/productDTOs";

export const create_product = async (req: Request, res: Response): Promise<void> => {
  try {
    const productData: CreateProductDTO = req.body;
    const result = await ProductService.create_product(productData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const update_product = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }
    const productData: UpdateProductDTO = req.body;
    const result = await ProductService.update_product({ ...productData, id });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const delete_product = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }
    await ProductService.delete_product(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const add_product_image = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const { image_url } = req.body;
    if (isNaN(product_id) || !image_url) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const result = await ProductService.add_product_image(product_id, image_url);
    res.status(204).json(result);
  } catch (error) {
    console.error('Error adding product image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const remove_product_image = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const image_id = parseInt(req.params.imageId, 10);
    if (isNaN(product_id) || isNaN(image_id)) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const result = await ProductService.remove_product_image(image_id, product_id);
    res.status(204).json(result);
  } catch (error) {
    console.error('Error removing product image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const add_product_category = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const { category_id } = req.body;
    if (isNaN(product_id) || !category_id) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const result = await ProductService.add_product_category(product_id, category_id);
    res.status(204).json(result);
  } catch (error) {
    console.error('Error adding product category:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const remove_product_category = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const category_id = parseInt(req.params.categoryId, 10);
    if (isNaN(product_id) || isNaN(category_id)) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const result = await ProductService.remove_product_category(product_id, category_id);
    res.status(204).json(result);
  } catch (error) {
    console.error('Error removing product category:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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
    console.error('Error adding product car model:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const remove_product_car_model = async (req: Request, res: Response): Promise<void> => {
  try {
    const product_id = parseInt(req.params.id, 10);
    const car_model_id = parseInt(req.params.carModelId, 10);
    if (isNaN(product_id) || isNaN(car_model_id)) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const result = await ProductService.remove_product_car_model(product_id, car_model_id);
    res.status(204).json(result);
  } catch (error) {
    console.error('Error removing product car model:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};