import { CatalogByEnterpriseResult, ProductCatalogItemDTO } from '../dtos/catalogDTOs';
import db from './db';

export const get_catalog = async (): Promise<ProductCatalogItemDTO[]> => {
  try {
    const result = await db.raw('SELECT catalog_all() AS catalog;');
    return result.rows[0].catalog;
  } catch (error) {
    console.error('Error fetching catalog:', error);
    throw error;
  }
}

export const get_catalog_by_id = async (productId: number): Promise<ProductCatalogItemDTO | null> => {
  try {
    const result = await db.raw('SELECT catalog_by_id(?) AS catalog;', [productId]);
    return result.rows[0].catalog;
  } catch (error) {
    console.error('Error fetching catalog by ID:', error);
    throw error;
  }
}

export const get_catalog_by_category = async (categoryId: number): Promise<ProductCatalogItemDTO[]> => {
  try {
    const result = await db.raw('SELECT catalog_by_category(?) AS catalog;', [categoryId]);
    return result.rows[0].catalog;
  } catch (error) {
    console.error('Error fetching catalog by category:', error);
    throw error;
  }
}

export const get_catalog_n_by_category = async (categoryId: number, n: number): Promise<ProductCatalogItemDTO[]> => {
  try {
    const result = await db.raw('SELECT catalog_n_by_category(?, ?) AS catalog;', [categoryId, n]);
    return result.rows[0].catalog;
  } catch (error) {
    console.error('Error fetching catalog by category:', error);
    throw error;
  }
}

export const get_catalog_by_enterprise = async (enterpriseId: number): Promise<CatalogByEnterpriseResult> => {
  try {
    const result = await db.raw('SELECT catalog_by_enterprise(?) AS result;', [enterpriseId]);
    return result.rows[0].result;
  } catch (error) {
    console.error('Error fetching catalog by enterprise:', error);
    throw error;
  }
}
