import { Router } from "express";
import * as ProductController from '../controllers/productController';
import { validateParams } from "../middlewares/validateParams";
import { paramIdSchema } from "../middlewares/schemas/paramsSchema";

const router = Router();

router.route('/').post(ProductController.create_product);
router.route('/:id')
  .put(validateParams(paramIdSchema), ProductController.update_product)
  .delete(validateParams(paramIdSchema), ProductController.delete_product);
router.route('/:id/images').post(ProductController.add_product_image);
router.route('/:id/images/:imageId').delete(ProductController.remove_product_image);
router.route('/:id/categories/').post(ProductController.add_product_category);
router.route('/:id/categories/:categoryId').delete(ProductController.remove_product_category);
router.route('/:id/car_models/').post(ProductController.add_product_car_model);
router.route('/:id/car_models/:carModelId').delete(ProductController.remove_product_car_model);

export default router;