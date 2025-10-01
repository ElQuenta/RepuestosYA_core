import { Router } from 'express';
import * as AuthController from '../controllers/authController';

const router = Router();

router.post('/register/enterprise', AuthController.registerEnterpriseAccount);
router.post('/register/account', AuthController.registerAccount);
router.post('/login', AuthController.login);

export default router;