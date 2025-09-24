import { Request, Response } from 'express';
import * as AuthService from '../services/authService';
import { globalErrorHandler } from '../handlers/errorHandler';
import { sendSuccess, sendCreated } from '../handlers/successHandler'
import { InternalServerError } from '../errors/baseErrors';

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son obligatorios',
      });
    }

    const { token, user } = await AuthService.login(email, password);

    return sendSuccess(res, { token, user }, 'Login successful');
  } catch (error: any) {
    if (error instanceof Error) {
      return globalErrorHandler(error, res);
    }
    return globalErrorHandler(new InternalServerError(), res);
  }
};

export const registerEnterprise = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      username, email, password, cellphone_num, roles = [],
      NIT, address, representant, representant_CI,
      description = null, links = []
    } = req.body;

    const newEnterprise = await AuthService.registerEnterprise({
      username, email, password, cellphone_num, roles,
      NIT, address, representant, representant_CI,
      description, links
    });

    return sendCreated(res, newEnterprise, 'Empresa registrada con éxito');
  } catch (error: any) {
    if (error instanceof Error) {
      return globalErrorHandler(error, res);
    }

    return globalErrorHandler(new InternalServerError(), res);
  }
}

export const registerAccount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, email, password, cellphone_num, roles } = req.body;
    const newAccount = await AuthService.registerAccount({ username, email, password, cellphone_num, roles });
    return sendCreated(res, newAccount, 'Cuenta registrada con éxito');
  } catch (error: any) {
    if (error instanceof Error) {
      return globalErrorHandler(error, res);
    }

    return globalErrorHandler(new InternalServerError(), res);
  }
}