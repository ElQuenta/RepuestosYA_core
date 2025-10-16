import Joi from 'joi';

export const paramIdSchema = Joi.object({
  id: Joi.number().integer().required().messages({
    'number.base': 'ID must be an integer',
    'number.integer': 'ID must be a valid integer',
    'any.required': 'ID is required',
  }),
});

export const paramAccountIdSchema = Joi.object({
  accountId: Joi.number().integer().required().messages({
    'number.base': 'Account ID must be an integer',
    'number.integer': 'Account ID must be a valid integer',
    'any.required': 'Account ID is required',
  }),
});

export const paramEnterpriseIdSchema = Joi.object({
  enterpriseId: Joi.number().integer().required().messages({
    'number.base': 'Enterprise ID must be an integer',
    'number.integer': 'Enterprise ID must be a valid integer',
    'any.required': 'Enterprise ID is required',
  }),
});

export const paramProductIdSchema = Joi.object({
  productId: Joi.number().integer().required().messages({
    'number.base': 'Product ID must be an integer',
    'number.integer': 'Product ID must be a valid integer',
    'any.required': 'Product ID is required',
  }),
});

export const paramCategoryIdSchema = Joi.object({
  categoryId: Joi.number().integer().required().messages({
    'number.base': 'Category ID must be an integer',
    'number.integer': 'Category ID must be a valid integer',
    'any.required': 'Category ID is required',
  }),
});

export const paramNProductsSchema = Joi.object({
  n: Joi.number().integer().min(1).required().messages({
    'number.base': 'N must be an integer',
    'number.integer': 'N must be a valid integer',
    'number.min': 'N must be at least 1',
    'any.required': 'N is required',
  }),
});

export const carModelIdSchema = Joi.object({
  carModelId: Joi.number().integer().required().messages({
    'number.base': 'Car Model ID must be an integer',
    'number.integer': 'Car Model ID must be a valid integer',
    'any.required': 'Car Model ID is required',
  }),
});

export const imageIdSchema = Joi.object({
  imageId: Joi.number().integer().required().messages({
    'number.base': 'Image ID must be an integer',
    'number.integer': 'Image ID must be a valid integer',
    'any.required': 'Image ID is required',
  }),
});

export const itemIdSchema = Joi.object({
  itemId: Joi.number().integer().required().messages({
    'number.base': 'Item ID must be an integer',
    'number.integer': 'Item ID must be a valid integer',
    'any.required': 'Item ID is required',
  }),
});