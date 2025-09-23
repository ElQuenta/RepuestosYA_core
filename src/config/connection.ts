import config from './config';

const { database } = config;

const connection = {
  host: database.host,
  database: database.name,
  user: database.user,
  password: database.password,
  port: database.port,
  ssl: database.ssl ? { rejectUnauthorized: false } : false,
};

export default connection;
