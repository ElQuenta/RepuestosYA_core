import db from './db';
import { UpdateAccountDTO, UpdateEnterpriseDTO } from '../dtos/userDTOs';

export const updateAccount = async (data: UpdateAccountDTO) => {
  const { id, username, email, password, cellphone } = data;
  try {
    const result = await db.raw(
      `SELECT update_account(?, ?, ?, ?, ?) AS metadata;`,
      [id, username ? username : null, email ? email : null, password ? password : null, cellphone ? cellphone : null]
    );
    if (!result || !result.rows || result.rows.length === 0 || !result.rows[0].metadata) {
      throw new Error('Failed to update account');
    }
    return result.rows[0].metadata;
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};

export const updateEnterprise = async (data: UpdateEnterpriseDTO) => {
  const { id, accountId, nit, address, description, representant, representantCi, enabled } = data;
  try {
    const result = await db.raw(`
      SELECT update_enterprise_account(?, ?, ?, ?, ?, ?, ?, ?) AS metadata;
      `, [id, enabled ? enabled : null, nit ? nit : null, address ? address : null, description ? description : null, representant ? representant : null, representantCi ? representantCi : null, accountId ? accountId : null]);
    if (!result || !result.rows || result.rows.length === 0 || !result.rows[0].metadata) {
      throw new Error('Failed to update enterprise');
    }
    return result.rows[0].metadata;
  } catch (error) {
    console.error('Error updating enterprise:', error);
    throw error;
  }
};

export const deleteAccount = async (id: number) => {
  try {
    const result = await db('accounts').delete().where({ id });
    if (!result) {
      throw new Error('Failed to delete account');
    }
    return result;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

export const add_role_to_account = async (accountId: number, roleId: number) => {
  try {
    await db.raw(`
      CALL add_role_to_account(?, ?);
    `, [accountId, roleId]);

  } catch (error) {
    console.error('Error adding role to account:', error);
    throw error;
  }
};

export const remove_role_from_account = async (accountId: number, roleId: number) => {
  try {
    await db.raw(`
      CALL remove_role_from_account(?, ?);
    `, [accountId, roleId]);
  } catch (error) {
    console.error('Error removing role from account:', error);
    throw error;
  }
};

export const add_external_link = async (accountId: number, name: string, url: string) => {
  try {
    await db.raw(`
      CALL add_external_link(?, ?, ?);
    `, [accountId, name, url]);
  } catch (error) {
    console.error('Error adding external link:', error);
    throw error;
  }
};

export const remove_external_link = async (externalLinkId: number) => {
  try {
    await db.raw(`
      CALL remove_external_link(?);
    `, [externalLinkId]);
  } catch (error) {
    console.error('Error removing external link:', error);
    throw error;
  }
};

export const update_external_link = async (accountId: number, name: string, url: string) => {
  try {
    await db.raw(`
      CALL update_external_link(?, ?, ?);
    `, [accountId, name, url]);
  } catch (error) {
    console.error('Error updating external link:', error);
    throw error;
  }
};