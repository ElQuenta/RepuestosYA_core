import { Router } from "express";

import * as CatalogController from "../controller/catalogController";

const router = Router();

router.get("/", CatalogController.getAllProducts);
router.get("/:productId", CatalogController.getProductByID);
router.get("/store/:storeId", CatalogController.getAllProductByStoreID);
router.get("/category/:categoryId", CatalogController.getAllProductsByCategoryId);
router.get("/category/:categoryId/limit/:limit", CatalogController.getNProductsByCategoryId);

export default router;