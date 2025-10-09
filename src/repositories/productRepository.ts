import db from './db';
import { CreateProductDTO, CreateProductResponse, UpdateProductDTO, UpdateProductResponse } from '../dtos/productDTOs';
import { ConflictError, BadRequestError } from '../errors/commonErrors';

const TABLE_PRODUCTS = 'products';

export const create_product = async (productData: CreateProductDTO): Promise<CreateProductResponse> => {
  const { name, stock, price, categories, brands: brand_id, car_models, images, enterprise_id } = productData;
  try {
    const result = await db.raw(
      `
    SELECT create_product(?, ?, ?, ?, ?, ?, ?, ?::json) AS metadata
    ` ,
      [
        name, enterprise_id, stock, price,
        categories, car_models, brand_id, JSON.stringify(images),
      ]
    );
    if (!result || !result.rows || result.rows.length === 0 || !result.rows[0].metadata) {
      throw new ConflictError('Failed to create product');
    }
    return result.rows[0].metadata;
  } catch (err) {
    console.error('create_product error. payload:', { productData });
    throw err;
  }
}

export const update_product = async (productData: UpdateProductDTO): Promise<UpdateProductResponse> => {
  const { id, name, stock, price, enterprise_id } = productData;
  try {
    const result = await db.raw(
      `
    SELECT update_product(?, ?, ?, ?, ?) as metadata
    `,
      [
        id,
        name ?? null,
        enterprise_id ?? null,
        stock ?? null,
        price ?? null
      ]
    );
    if (!result || !result.rows || result.rows.length === 0 || !result.rows[0].metadata) {
      throw new BadRequestError('Failed to update product');
    }
    return result.rows[0].metadata;
  } catch (err) {
    console.error('update_product error. payload:', { productData });
    throw err;
  }
}

export const delete_product = async (product_id: number): Promise<void> => {
  try {
    await db(TABLE_PRODUCTS).delete().where({ id: product_id });
  } catch (err) {
    console.error('update_product error. payload:', {});
    throw err;
  }
}

export const add_product_new_image = async (product_id: number, image_url: string): Promise<void> => {
  try {
    await db.raw(
      `
    CALL add_new_image(?, ?)
    `,
      [product_id, image_url]
    );
  } catch (err) {
    console.error('add_product_new_image error. payload:', { product_id, image_url });
    throw err;
  }
}

export const remove_product_image = async (image_id: number, product_id: number): Promise<void> => {
  try {
    await db.raw(`CALL remove_image(?, ?)`, [product_id, image_id]);
  } catch (err) {
    console.error('remove_product_image error. payload:', { image_id, product_id });
    throw err;
  }
}

export const add_product_category = async (product_id: number, category_id: number): Promise<void> => {
  try {
    await db.raw(`CALL add_category(?, ?)`, [product_id, category_id]);
  } catch (err) {
    console.error('add_product_category error. payload:', { product_id, category_id });
    throw err;
  }
}

export const remove_product_category = async (product_id: number, category_id: number): Promise<void> => {
  try {
    await db.raw(`CALL remove_category(?, ?)`, [product_id, category_id]);
  } catch (err) {
    console.error('remove_product_category error. payload:', { product_id, category_id });
    throw err;
  }
}

export const add_product_car_model = async (product_id: number, car_model_id: number): Promise<void> => {
  try {
    await db.raw(`CALL add_car(?, ?)`, [product_id, car_model_id]);
  } catch (err) {
    console.error('add_product_category error. payload:', { product_id, category_id: car_model_id });
    throw err;
  }
}

export const remove_product_car_model = async (product_id: number, category_id: number): Promise<void> => {
  try {
    await db.raw(`CALL remove_car(?, ?)`, [product_id, category_id]);
  } catch (err) {
    console.error('remove_product_category error. payload:', { product_id, category_id });
    throw err;
  }
}