import { Router } from 'express';
import * as AuthController from '../controllers/authController';
import { validateBody as validateSchema } from '../middlewares/validateSchema';
import { registerAccountSchema, registerEnterpriseAccountSchema } from '../middlewares/schemas/userSchemas';

const router = Router();

router.post('/register/enterprise', validateSchema(registerEnterpriseAccountSchema), AuthController.registerEnterpriseAccount);
router.post('/register/account', validateSchema(registerAccountSchema), AuthController.registerAccount);
router.post('/login', AuthController.login);

export default router;