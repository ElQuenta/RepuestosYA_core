import Joi from 'joi';

export const registerExternalLinksSchema = Joi.object({
  name: Joi.string().required(),
  link: Joi.string().uri().required()
});

export const registerEnterpriseAccountSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  cellphone: Joi.string().required(),
  nit: Joi.string().required(),
  address: Joi.string().required(),
  representant: Joi.string().required(),
  representantCi: Joi.string().required(),
  roles: Joi.array().items(Joi.number().integer()).required(),
  description: Joi.string().required(),
  links: Joi.array().items(registerExternalLinksSchema).required()
});

export const registerAccountSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  cellphone: Joi.string().required(),
  roles: Joi.array().items(Joi.number().integer()).required()
});

export const updateAccountSchema = Joi.object({
  username: Joi.string(),
  email: Joi.string().email(),
  password: Joi.string(),
  cellphone: Joi.string()
}).or('username', 'email', 'password', 'cellphone');

export const updateEnterpriseSchema = Joi.object({
  enabled: Joi.boolean(),
  nit: Joi.string(),
  address: Joi.string(),
  description: Joi.string(),
  representant: Joi.string(),
  representantCi: Joi.string(),
  accountId: Joi.number().integer()
}).or(
  'enabled',
  'nit',
  'address',
  'description',
  'representant',
  'representantCi',
  'accountId'
);