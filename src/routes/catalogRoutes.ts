import { Router } from "express";
import * as CatalogController from '../controllers/catalogController';

const router = Router();

router.get('/', CatalogController.get_catalog);
router.get('/:id', CatalogController.get_catalog_by_id);
router.get('/category/:categoryId', CatalogController.get_catalog_by_category);
router.get('/category/:categoryId/limit/:n', CatalogController.get_catalog_n_by_category);
router.get('/store/:enterpriseId', CatalogController.get_catalog_by_enterprise);

export default router;
