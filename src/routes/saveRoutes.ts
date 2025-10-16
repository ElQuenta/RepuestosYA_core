import { Router } from 'express';

import * as saveController from '../controllers/saveController';

const router = Router();

router.route('/accounts/:id/save/:itemId')
  .post(saveController.save_product)
  .delete(saveController.unsave_product);

router.route('/accounts/:id/saved')
  .get(saveController.get_saved_products);

export default router;