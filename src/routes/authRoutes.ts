import { Router } from 'express';
import * as AuthController from '../controller/authController';

const router = Router();

router.route('/login').post(AuthController.login);
router.route('/register/enterprise').post(AuthController.registerEnterprise);
router.route('/register/account').post(AuthController.registerAccount);

export default router;