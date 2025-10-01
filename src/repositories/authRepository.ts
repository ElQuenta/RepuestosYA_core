import { getAccountResult, RegisterAccountDTO, RegisterAccountResult,
  RegisterEnterpriseAccountDTO, RegisterEnterpriseResult } from '../dtos/authDTOS';
import db from './db';

export const register_enterprise_account = async (data: RegisterEnterpriseAccountDTO): Promise<RegisterEnterpriseResult> => {
  const {
    username, email, password, cellphone, nit, address,
    representant, representantCi, roles = [], description = null, links = []
  } = data;

  try {
    const res = await db.raw(
      `SELECT register_enterprise_account(
        ?, ?, ?, ?, ?, ?, ?, ?, ?::integer[], ?, ?::json
      ) AS metadata`,
      [
        username, email, password, cellphone, nit, address,
        representant, representantCi, roles, description, JSON.stringify(links)
      ]
    );

    if (!res || !res.rows || res.rows.length === 0 || !res.rows[0].metadata) {
      throw new Error('Failed to register enterprise account');
    }
    const userData: RegisterEnterpriseResult = res.rows[0].metadata;
    return userData;
  } catch (err) {
    console.error('register_enterprise_account error. payload:', {
      username, email, cellphone, nit, address, representant, representantCi, roles, description, links
    });
    throw err;
  }
};

export const register_account = async (data: RegisterAccountDTO): Promise<RegisterAccountResult> => {
  const { username, email, password, cellphone, roles = [] } = data;

  try {
    const res = await db.raw(
      `SELECT register_account(?, ?, ?, ?, ?::integer[]) AS metadata`,
      [username, email, password, cellphone, roles]
    );
    if (!res || !res.rows || res.rows.length === 0 || !res.rows[0].metadata) {
      throw new Error('Failed to register account');
    }
    return res.rows[0].metadata;
  } catch (err) {
    console.error('register_account error. payload:', { username, email, cellphone, roles });
    throw err;
  }
}

export const get_account_by_email = async (email: string): Promise<getAccountResult> => {
  try {
    const res = await db.raw(
      `SELECT get_account_by_email(?) AS metadata`,
      [email]
    );
    if (!res || !res.rows || res.rows.length === 0 || !res.rows[0].metadata) {
      throw new Error('Failed to get account by email');
    }
    return res.rows[0].metadata;
  } catch (err) {
    console.error('get_account_by_email - no metadata returned. payload:', { email });
    throw err;
  }
};