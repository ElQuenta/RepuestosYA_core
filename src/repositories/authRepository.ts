import { FullUserResponse, CreateEnterpriseWithAccountParams, CreateAccountWithRolesParams } from "../dtos/authDTOS";
import { buildLogger } from "../utils/logger";
import db from "./db";

const GET_USER_BY_EMAIL = "get_user_full_by_email";

export const get_user_by_email = async (email: string): Promise<FullUserResponse | null> => {
  try {
    const raw = await db.raw(`SELECT ${GET_USER_BY_EMAIL}(?) as data`, [email]);

    const rows = (raw && (raw.rows ?? raw[0])) as any[] | undefined;
    const data = rows && rows[0] ? rows[0].data : null;

    if (!data) return null;

    return data as FullUserResponse;
  } catch (err) {
    throw err;
  }
};

export const createEnterpriseWithAccount = async (params: CreateEnterpriseWithAccountParams) => {
  try {
    const {
      username, email, password, cellphone_num, roles = [],
      NIT, address, representant, representant_CI,
      description = null, links = []
    } = params;

    const linksJson = JSON.stringify(links);

    const result = await db.raw(
      `SELECT * FROM create_enterprise_with_account(
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )`,
      [username, email, password, cellphone_num, NIT, address, representant, representant_CI, roles, description, linksJson]
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

export const createAccountWithRoles = async (
  params: CreateAccountWithRolesParams
) => {
  try {
    const { username, email, password, cellphone_num, roles } = params;

    const result = await db.raw(
      `SELECT * FROM create_account_with_roles(
        ?, ?, ?, ?, ?
      )`,
      [username, email, password, cellphone_num, roles]
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
}