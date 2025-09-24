import bcrypt from 'bcryptjs';
import * as AuthRepository from '../repositories/authRepository';
import { generateToken } from '../utils/jwtUtility';
import { CreateAccountWithRolesParams, CreateEnterpriseWithAccountParams, FullUserResponse } from '../dtos/authDTOS';
import { AuthenticationError } from '../errors/authErrors'
import * as AuthenticationService from './authenticationService';
import { buildLogger } from '../utils/logger';


const logger = buildLogger('auth-service');

export const login = async (
  email: string,
  password: string
): Promise<{ token: string; user: FullUserResponse }> => {
  try {
    const user = await AuthRepository.get_user_by_email(email);
    if (!user) {
      throw new AuthenticationError();
    }

    const storedHash = user.account.password;
    if (!storedHash) {
      throw new AuthenticationError();
    }

    const isMatch = await AuthenticationService.verifyPassword(password, storedHash);
    if (!isMatch) {
      throw new AuthenticationError();
    }

    const roles =
      Array.isArray(user.roles) && user.roles.length > 0
        ? user.roles.map((r: any) => r.name)
        : [];

    const token = generateToken(user.account.id, roles);

    const safeAccount = { ...user.account };
    delete (safeAccount as any).password;

    return {
      token,
      user: {
        ...user,
        account: safeAccount,
      },
    };
  } catch (error) {
    logger.error("Error during login:" + error);
    throw error;
  }
};

export const registerEnterprise = async (params: CreateEnterpriseWithAccountParams) => {
  try {
    params.password = await AuthenticationService.hashPassword(params.password);
    return await AuthRepository.createEnterpriseWithAccount(params);
  } catch (error) {
    logger.error("Error registering enterprise:" + error);
    throw error;
  }
};

export const registerAccount = async (params: CreateAccountWithRolesParams) => {
  try {
    params.password = await AuthenticationService.hashPassword(params.password);
    return await AuthRepository.createAccountWithRoles(params);
  } catch (error) {
    logger.error("Error registering account:" + error);
    throw error;
  }
};
