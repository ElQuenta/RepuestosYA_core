import { Request, Response } from 'express';

import * as UserService from '../services/userService';
import { UpdateAccountDTO, UpdateEnterpriseDTO } from '../dtos/userDTOs';

export const update_account = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const data: UpdateAccountDTO = req.body;
  try {

    const updatedAccount = await UserService.updateAccount({ ...data, id });
    res.json(updatedAccount);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const update_enterprise = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const data: UpdateEnterpriseDTO = req.body;
  try {
    const updatedEnterprise = await UserService.updateEnterprise({ ...data, id });
    res.json(updatedEnterprise);
  } catch (error) {
    console.error('Error updating enterprise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const delete_account = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    await UserService.deleteAccount(id);
    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const add_role_to_account = async (req: Request, res: Response): Promise<void> => {
  const accountId = parseInt(req.params.accountId, 10);
  const roleId = parseInt(req.params.roleId, 10);
  try {
    await UserService.addRoleToAccount(accountId, roleId);
    res.sendStatus(204);
  } catch (error) {
    console.error('Error adding role to account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const remove_role_from_account = async (req: Request, res: Response): Promise<void> => {
  const accountId = parseInt(req.params.accountId, 10);
  const roleId = parseInt(req.params.roleId, 10);
  try {
    await UserService.removeRoleFromAccount(accountId, roleId);
    res.sendStatus(204);
  } catch (error) {
    console.error('Error removing role from account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const add_external_link = async (req: Request, res: Response): Promise<void> => {
  const accountId = parseInt(req.params.accountId, 10);
  const { name, url } = req.body;
  try {
    const newLink = await UserService.addExternalLink(accountId, name, url);
    res.status(201).json(newLink);
  } catch (error) {
    console.error('Error adding external link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const remove_external_link = async (req: Request, res: Response): Promise<void> => {
  const externalLinkId = parseInt(req.params.externalLinkId, 10);
  try {
    await UserService.removeExternalLink(externalLinkId);
    res.sendStatus(204);
  } catch (error) {
    console.error('Error removing external link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const update_external_link = async (req: Request, res: Response): Promise<void> => {
  const externalLinkId = parseInt(req.params.externalLinkId, 10);
  const { name, url } = req.body;
  try {
    const updatedLink = await UserService.updateExternalLink(externalLinkId, name, url);
    res.json(updatedLink);
  } catch (error) {
    console.error('Error updating external link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
