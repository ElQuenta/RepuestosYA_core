import type { Knex } from "knex";

const TABLE_ACCOUNT_LOG = "account_log";
const TABLE_ENTERPRISE_LOG = "enterprise_log";
const TABLE_ACCOUNT_SAVE_LOG = "account_save_log";
const TABLE_PRODUCT_LOG = "product_log";

export async function up(knex: Knex): Promise<void> {
  return knex.schema

    .createTable(TABLE_ACCOUNT_LOG, (table) => {
      table.increments("id").primary();
      table.integer("account_id").notNullable();
      table.string("action").notNullable();
      table.json("metadata").nullable();
      table.timestamps(true, true);
    })

    .createTable(TABLE_ENTERPRISE_LOG, (table) => {
      table.increments("id").primary();
      table.integer("enterprise_id").notNullable();
      table.string("action").notNullable();
      table.json("metadata").nullable();
      table.timestamps(true, true);
    })

    .createTable(TABLE_ACCOUNT_SAVE_LOG, (table) => {
      table.increments("id").primary();
      table.integer("product_id").notNullable();
      table.integer("account_id").notNullable();
      table.string("action").notNullable();
      table.json("metadata").nullable();
      table.timestamps(true, true);
    })

    .createTable(TABLE_PRODUCT_LOG, (table) => {
      table.increments("id").primary();
      table.integer("product_id").notNullable();
      table.string("action").notNullable();
      table.json("metadata").nullable();
      table.timestamps(true, true);
    });
};


export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .dropTableIfExists(TABLE_PRODUCT_LOG)
    .dropTableIfExists(TABLE_ACCOUNT_SAVE_LOG)
    .dropTableIfExists(TABLE_ENTERPRISE_LOG)
    .dropTableIfExists(TABLE_ACCOUNT_LOG);
};
