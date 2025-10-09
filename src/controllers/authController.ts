import { Request, Response } from "express";
import * as AuthService from "../services/authService";
import { RegisterAccountDTO, RegisterEnterpriseAccountDTO } from "../dtos/authDTOs";
import { handleError } from "../handlers/errorHandler";
import { sendCreated, sendSuccess } from '../handlers/successHandler';

export const registerEnterpriseAccount = async (req: Request, res: Response) => {
  try {
    const data: RegisterEnterpriseAccountDTO = req.body;
    const result = await AuthService.registerEnterpriseAccount(data);
    sendCreated(res, result, "Enterprise account created successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const registerAccount = async (req: Request, res: Response) => {
  try {
    const data: RegisterAccountDTO = req.body;
    const result = await AuthService.registerAccount(data);
    sendCreated(res, result, "Account created successfully");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    sendSuccess(res, result, "Login successful");
  } catch (error) {
    if (!(error instanceof Error)) {
      console.error("Unexpected error type:", error);
      handleError(res, new Error("Unexpected error occurred"));
    } else {
      handleError(res, error);
    }
  }
};