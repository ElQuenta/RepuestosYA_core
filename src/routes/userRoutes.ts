import { Router } from "express";
import * as UserController from "../controllers/userController";

const router = Router();

router.route("/account/:id")
  .put(UserController.update_account)
  .delete(UserController.delete_account);

router.route("/enterprise/:id")
  .put(UserController.update_enterprise);

router.route("/account/:accountId/role/:roleId")
  .post(UserController.add_role_to_account)
  .delete(UserController.remove_role_from_account);

router.route("/account/:accountId/external-link")
  .post(UserController.add_external_link);

router.route("/external-link/:externalLinkId")
  .delete(UserController.remove_external_link)
  .put(UserController.update_external_link);

export default router;