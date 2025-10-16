import Joi from 'joi';

export const createProductSchema = Joi.object({
  enterprise_id: Joi.number().integer().required(),
  name: Joi.string().required(),
  stock: Joi.number().integer().required(),
  price: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  categories: Joi.array().items(Joi.number().integer()).required(),
  brands: Joi.array().items(Joi.number().integer()).required(),
  car_models: Joi.array().items(Joi.number().integer()).required(),
  images: Joi.array().items(
    Joi.object({
      id: Joi.number().integer(),
      url: Joi.string().uri()
    })
  ).required()
});

export const updateProductSchema = Joi.object({
  name: Joi.string(),
  stock: Joi.number().integer(),
  price: Joi.alternatives().try(Joi.string(), Joi.number()),
  enterprise_id: Joi.number().integer()
}).or('name', 'stock', 'price', 'enterprise_id');