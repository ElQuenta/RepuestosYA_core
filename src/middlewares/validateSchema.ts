import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

import { ValidationError } from '../errors/commonErrors';
import { handleError } from '../handlers/errorHandler';

export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const validation_error = new ValidationError(`Validation error: ${error.details.map((d) => d.message).join(', ')}`);
      return handleError(res, validation_error);
    }
    next();
  };
};