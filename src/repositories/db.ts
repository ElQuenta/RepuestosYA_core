// src/db/index.ts
import knex from 'knex';
import connection from '../config/connection';

const db = knex({
  client: 'pg',
  connection,
  // opcional: timeout, pool, etc.
  pool: { min: 0, max: 10 },
});

export default db;
