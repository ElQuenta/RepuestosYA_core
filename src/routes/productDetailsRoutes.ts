import { Router } from "express";

import * as ProductDetailsController from "../controllers/productDetailsController";
import { validateParams } from "../middlewares/validateParams";
import { paramIdSchema } from "../middlewares/schemas/paramsSchema";

const router = Router();

router.route("/car-model")
  .post(ProductDetailsController.create_car_model)
  .get(ProductDetailsController.fetch_car_models);

router.route("/brand")
  .post(ProductDetailsController.create_brand)
  .get(ProductDetailsController.fetch_brands);

router.route("/car-model/:id")
  .delete(validateParams(paramIdSchema), ProductDetailsController.remove_car_model);

router.route("/brand/:id")
  .delete(validateParams(paramIdSchema), ProductDetailsController.remove_brand);

export default router;