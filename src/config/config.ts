// src/config/index.ts
import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_SERVER_PORT = 3000;
const DEFAULT_NODE_ENV = 'development';

const parseBool = (v?: string) => {
  if (!v) return false;
  const s = v.toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes';
};

const config = {
  env: process.env.NODE_ENV || DEFAULT_NODE_ENV,
  server: {
    port: Number(process.env.SERVER_PORT) || DEFAULT_SERVER_PORT,
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    name: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: Number(process.env.DB_PORT) || 5466,
    ssl: parseBool(process.env.SSL),
  },
  allowedOrigins: [],
};

export default config;
