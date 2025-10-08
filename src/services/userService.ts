import * as UserRepository from '../repositories/userRepository';
import { UpdateAccountDTO, UpdateEnterpriseDTO } from '../dtos/userDTOs';
import e from 'express';

export const updateAccount = async (data: UpdateAccountDTO) => {
  return await UserRepository.updateAccount(data);
};

export const updateEnterprise = async (data: UpdateEnterpriseDTO) => {
  return await UserRepository.updateEnterprise(data);
};

export const deleteAccount = async (id: number) => {
  await UserRepository.deleteAccount(id);
};

export const addRoleToAccount = async (accountId: number, roleId: number) => {
  await UserRepository.add_role_to_account(accountId, roleId);
};

export const removeRoleFromAccount = async (accountId: number, roleId: number) => {
  await UserRepository.remove_role_from_account(accountId, roleId);
};

export const addExternalLink = async (accountId: number, name: string, url: string) => {
  await UserRepository.add_external_link(accountId, name, url);
};

export const removeExternalLink = async (externalLinkId: number) => {
  await UserRepository.remove_external_link(externalLinkId);
};

export const updateExternalLink = async (externalLinkId: number, name: string, url: string) => {
  await UserRepository.update_external_link(externalLinkId, name, url);
};