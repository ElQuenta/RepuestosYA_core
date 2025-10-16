import { Router } from "express";
import * as UserController from "../controllers/userController";
import { validateParams } from "../middlewares/validateParams";
import { validateBody } from "../middlewares/validateSchema";
import { paramIdSchema } from "../middlewares/schemas/paramsSchema";
import { updateAccountSchema, updateEnterpriseSchema } from "../middlewares/schemas/userSchemas";

const router = Router();

router.route("/account/:id")
  .put(validateParams(paramIdSchema), validateBody(updateAccountSchema), UserController.update_account)
  .delete(validateParams(paramIdSchema), UserController.delete_account);

router.route("/enterprise/:id")
  .put(validateParams(paramIdSchema), validateBody(updateEnterpriseSchema), UserController.update_enterprise);

router.route("/account/:accountId/role/:roleId")
  .post(UserController.add_role_to_account)
  .delete(UserController.remove_role_from_account);

router.route("/account/:accountId/external-link")
  .post(UserController.add_external_link);

router.route("/external-link/:externalLinkId")
  .delete(UserController.remove_external_link)
  .put(UserController.update_external_link);

export default router;