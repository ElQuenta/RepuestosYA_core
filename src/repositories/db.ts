import knex from 'knex';
import connection from '../config/connection';

const db = knex({
  client: 'pg',
  connection,
  pool: { min: 0, max: 10 },
});

export default db;
