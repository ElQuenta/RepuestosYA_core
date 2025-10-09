import {
  LoginResult, RegisterAccountDTO, RegisterAccountResult,
  RegisterEnterpriseAccountDTO, RegisterEnterpriseResult
} from '../dtos/authDTOs';
import * as AuthRepository from '../repositories/authRepository';
import * as AuthenticationService from './authenticationService';
import { generateToken } from '../utils/jwtUtility';
import { AuthenticationError } from '../errors/authError';

export const registerEnterpriseAccount = async (data: RegisterEnterpriseAccountDTO): Promise<RegisterEnterpriseResult> => {
  const hashedPassword = await AuthenticationService.hashPassword(data.password);
  return await AuthRepository.register_enterprise_account({ ...data, password: hashedPassword });
};

export const registerAccount = async (data: RegisterAccountDTO): Promise<RegisterAccountResult> => {
  const hashedPassword = await AuthenticationService.hashPassword(data.password);
  return await AuthRepository.register_account({ ...data, password: hashedPassword });
};

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const result = await AuthRepository.get_account_by_email(email);
  if (!result || !result.user) {
    throw new AuthenticationError('User not found');
  }
  if (!result.user.password) {
    throw new AuthenticationError('Password not set for user');
  }

  const isValidPassword = await AuthenticationService.verifyPassword(password, result.user.password);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid password');
  }

  const token = generateToken(Number(result.user.id), result.user.roles.map(r => r.role));
  const response: LoginResult = { token, user: result.user, enterprise: result.enterprise };
  response.user.password = undefined;
  return response;

};
