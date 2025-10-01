import { Request, Response } from "express";
import * as AuthService from "../services/authService";
import { RegisterAccountDTO, RegisterEnterpriseAccountDTO } from "../dtos/authDTOS";

export const registerEnterpriseAccount = async (req: Request, res: Response) => {
  try {
    const data: RegisterEnterpriseAccountDTO = req.body;
    const result = await AuthService.registerEnterpriseAccount(data);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error in registerEnterpriseAccount:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const registerAccount = async (req: Request, res: Response) => {
  try {
    const data: RegisterAccountDTO = req.body;
    const result = await AuthService.registerAccount(data);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error in registerEnterpriseAccount:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in login:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
};