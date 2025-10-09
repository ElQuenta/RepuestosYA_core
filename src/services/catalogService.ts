import * as CatalogRepository from '../repositories/catalogRepository'
import { CatalogByEnterpriseResult, ProductCatalogItemDTO } from '../dtos/catalogDTOs';

export const get_catalog = async (): Promise<ProductCatalogItemDTO[]> => {
  //TODO: conectar a Firebase Storage para obtener imagenes de productos
  return await CatalogRepository.get_catalog();
}

export const get_catalog_by_id = async (productId: number): Promise<ProductCatalogItemDTO | null> => {
  //TODO: conectar a Firebase Storage para obtener imagenes de productos
  return await CatalogRepository.get_catalog_by_id(productId);
}

export const get_catalog_by_category = async (categoryId: number): Promise<ProductCatalogItemDTO[]> => {
  //TODO: conectar a Firebase Storage para obtener imagenes de productos
  return await CatalogRepository.get_catalog_by_category(categoryId);
}

export const get_catalog_n_by_category = async (categoryId: number, n: number): Promise<ProductCatalogItemDTO[]> => {
  //TODO: conectar a Firebase Storage para obtener imagenes de productos
  return await CatalogRepository.get_catalog_n_by_category(categoryId, n);
}

export const get_catalog_by_enterprise = async (enterpriseId: number): Promise<CatalogByEnterpriseResult> => {
  //TODO: conectar a Firebase Storage para obtener imagenes de productos
  return await CatalogRepository.get_catalog_by_enterprise(enterpriseId);
}