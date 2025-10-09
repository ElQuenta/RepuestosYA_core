import { CreateProductDTO, CreateProductResponse, UpdateProductDTO, UpdateProductResponse } from '../dtos/productDTOs';
import * as ProductRepository from '../repositories/productRepository';

export const create_product = async (productData: CreateProductDTO): Promise<CreateProductResponse> => {
  return await ProductRepository.create_product(productData);
}

export const update_product = async (productData: UpdateProductDTO): Promise<UpdateProductResponse> => {
  return await ProductRepository.update_product(productData);
}

export const delete_product = async (product_id: number): Promise<void> => {
  await ProductRepository.delete_product(product_id);
}

export const add_product_image = async (product_id: number, image_url: string): Promise<void> => {
  return await ProductRepository.add_product_new_image(product_id, image_url);
}

export const remove_product_image = async (image_id: number, product_id: number): Promise<void> => {
  return await ProductRepository.remove_product_image(image_id, product_id);
}

export const add_product_category = async (product_id: number, category_id: number): Promise<void> => {
  return await ProductRepository.add_product_category(product_id, category_id);
}

export const remove_product_category = async (product_id: number, category_id: number): Promise<void> => {
  return await ProductRepository.remove_product_category(product_id, category_id);
}

export const add_product_car_model = async (product_id: number, car_model_id: number): Promise<void> => {
  return await ProductRepository.add_product_car_model(product_id, car_model_id);
}

export const remove_product_car_model = async (product_id: number, brand_id: number): Promise<void> => {
  return await ProductRepository.remove_product_car_model(product_id, brand_id);
}