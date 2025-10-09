import { Router } from "express";

import * as ProductDetailsController from "../controllers/productDetailsController";

const router = Router();

router.route("/car-model")
  .post(ProductDetailsController.create_car_model)
  .get(ProductDetailsController.fetch_car_models);

router.route("/brand")
  .post(ProductDetailsController.create_brand)
  .get(ProductDetailsController.fetch_brands);

router.route("/car-model/:id")
  .delete(ProductDetailsController.remove_car_model);

router.route("/brand/:id")
  .delete(ProductDetailsController.remove_brand);

export default router;