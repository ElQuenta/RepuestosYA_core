import * as SaveRepository from '../repositories/saveRepository';

export const save_product = async (accountId: number, itemId: number) => {
  return await SaveRepository.save_product(itemId, accountId);
}

export const unsave_product = async (accountId: number, itemId: number) => {
  await SaveRepository.unsave_product(itemId, accountId);
}

export const get_saved_products = async (accountId: number) => {
  return await SaveRepository.get_saved_products(accountId);
}