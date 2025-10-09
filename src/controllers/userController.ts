import { Request, Response } from 'express';

import * as UserService from '../services/userService';
import { UpdateAccountDTO, UpdateEnterpriseDTO } from '../dtos/userDTOs';
import { handleError } from '../handlers/errorHandler';
import { sendSuccess, sendNoContent } from '../handlers/successHandler';

export const update_account = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const data: UpdateAccountDTO = req.body;
  try {

    const updatedAccount = await UserService.updateAccount({ ...data, id });
    sendSuccess(res, updatedAccount, "Account updated successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const update_enterprise = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const data: UpdateEnterpriseDTO = req.body;
  try {
    const updatedEnterprise = await UserService.updateEnterprise({ ...data, id });
    sendSuccess(res, updatedEnterprise, "Enterprise updated successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const delete_account = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    await UserService.deleteAccount(id);
    sendNoContent(res, "Account deleted successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const add_role_to_account = async (req: Request, res: Response): Promise<void> => {
  const accountId = parseInt(req.params.accountId, 10);
  const roleId = parseInt(req.params.roleId, 10);
  try {
    await UserService.addRoleToAccount(accountId, roleId);
    sendNoContent(res, "Role added to account successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const remove_role_from_account = async (req: Request, res: Response): Promise<void> => {
  const accountId = parseInt(req.params.accountId, 10);
  const roleId = parseInt(req.params.roleId, 10);
  try {
    await UserService.removeRoleFromAccount(accountId, roleId);
    sendNoContent(res, "Role removed from account successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const add_external_link = async (req: Request, res: Response): Promise<void> => {
  const accountId = parseInt(req.params.accountId, 10);
  const { name, url } = req.body;
  try {
    await UserService.addExternalLink(accountId, name, url);
    sendNoContent(res, "External link added successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const remove_external_link = async (req: Request, res: Response): Promise<void> => {
  const externalLinkId = parseInt(req.params.externalLinkId, 10);
  try {
    await UserService.removeExternalLink(externalLinkId);
    sendNoContent(res, "External link removed successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const update_external_link = async (req: Request, res: Response): Promise<void> => {
  const externalLinkId = parseInt(req.params.externalLinkId, 10);
  const { name, url } = req.body;
  try {
    const updatedLink = await UserService.updateExternalLink(externalLinkId, name, url);
    sendSuccess(res, updatedLink, "External link updated successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};
