import { Request, Response } from "express";
import { CatalogByEnterpriseResult, ProductCatalogItemDTO } from '../dtos/catalogDTOS';
import * as CatalogService from '../services/catalogService';

export const get_catalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const catalog = await CatalogService.get_catalog();
    res.json(catalog);
  } catch (error) {
    console.error('Error fetching catalog:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
export const get_catalog_by_id = async (req: Request, res: Response): Promise<void> => {
  const productId = Number(req.params.id);
  try {
    const catalogItem = await CatalogService.get_catalog_by_id(productId);
    if (catalogItem) {
      res.json(catalogItem);
    } else {
      res.status(404).json({ error: 'Catalog item not found' });
    }
  } catch (error) {
    console.error('Error fetching catalog by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const get_catalog_by_category = async (req: Request, res: Response): Promise<void> => {
  const categoryId = Number(req.params.categoryId);
  try {
    const catalogItems = await CatalogService.get_catalog_by_category(categoryId);
    res.json(catalogItems);
  } catch (error) {
    console.error('Error fetching catalog by category:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const get_catalog_n_by_category = async (req: Request, res: Response): Promise<void> => {
  const categoryId = Number(req.params.categoryId);
  const n = Number(req.params.n);
  try {
    const catalogItems = await CatalogService.get_catalog_n_by_category(categoryId, n);
    res.json(catalogItems);
  } catch (error) {
    console.error('Error fetching catalog by category:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const get_catalog_by_enterprise = async (req: Request, res: Response): Promise<void> => {
  const enterpriseId = Number(req.params.enterpriseId);
  try {
    const catalog = await CatalogService.get_catalog_by_enterprise(enterpriseId);
    res.json(catalog);
  } catch (error) {
    console.error('Error fetching catalog by enterprise:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
