import connection from '../src/config/connection';

const knexConfig = {
  development: {
    client: 'pg',
    connection,
    migrations: {
      directory: '../data/migrations',
    },
    seeds: {
      directory: '../data/seeds',
    },
  },
  staging: {
    client: 'pg',
    connection,
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
  production: {
    client: 'pg',
    connection,
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
};

export default knexConfig;
