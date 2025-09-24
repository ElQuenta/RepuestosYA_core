import * as CatalogRepository from '../repositories/catalogRepository';
import { buildLogger } from '../utils/logger';

const logger = buildLogger("catalogService");

export const getAllProducts = async () => {
  try {
    return await CatalogRepository.getAllProducts();
  } catch (error) {
    logger.error("Error fetching all products:" + error);
    throw error;
  }
}

export const getProductByID = async (productId : string) => {
  try {
    return await CatalogRepository.getProductByID(productId);
  } catch (error) {
    logger.error(`Error fetching product with ID ${productId}:` + error);
    throw error;
  }
}

export const getAllProductByCategoryID = async (categoryId : string) => {
  try {
    return await CatalogRepository.getAllProductByCategoryID(categoryId);
  } catch (error) {
    logger.error(`Error fetching products for category ID ${categoryId}:` + error);
    throw error;
  }
}

export const getNProductByCategoryID = async (categoryId : string, limit : number) => {
  try {
    return await CatalogRepository.getNProductByCategoryID(categoryId, limit);
  } catch (error) {
    logger.error(`Error fetching products for category ID ${categoryId} with limit ${limit}:` + error);
    throw error;
  }
}

export const getAllProductByStoreID = async (storeId : string) => {
  try {
    return await CatalogRepository.getAllProductByStoreID(storeId);
  } catch (error) {
    logger.error(`Error fetching products for category ID ${storeId}:` + error);
    throw error;
  }
}