import type { Knex } from 'knex';

const TABLE_ROLES = 'roles';
const TABLE_ACCOUNTS = 'accounts';
const TABLE_ACCOUNT_ROLES = 'account_roles';
const TABLE_ENTERPRISE_ACCOUNTS = 'enterprise_accounts';
const TABLE_EXTERNAL_LINKS = 'external_links';

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable(TABLE_ROLES, function (table) {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.timestamps(true, true);
    })

    .createTable(TABLE_ACCOUNTS, function (table) {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('email').notNullable().unique();
      table.string('password').notNullable();
      table.string('cellphone_num').notNullable();
      table.timestamps(true, true);
    })

    .createTable(TABLE_ACCOUNT_ROLES, function (table) {
      table
        .integer('account_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_ACCOUNTS)
        .onDelete('CASCADE');
      table
        .integer('role_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_ROLES)
        .onDelete('CASCADE');
      table.primary(['account_id', 'role_id']);
      table.timestamps(true, true);
    })

    .createTable(TABLE_ENTERPRISE_ACCOUNTS, function (table) {
      table.increments('id').primary();
      table.string('nit').notNullable().unique();
      table.string('address').notNullable();
      table.text('description');
      table.string('representant').notNullable();
      table.string('representant_ci').notNullable();
      table.boolean('enabled').defaultTo(false);
      table
        .integer('account_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_ACCOUNTS)
        .onDelete('CASCADE');
      table.timestamps(true, true);
    })

    .createTable(TABLE_EXTERNAL_LINKS, function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('link').notNullable();
      table
        .integer('enterprise_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_ENTERPRISE_ACCOUNTS)
        .onDelete('CASCADE');
      table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .dropTableIfExists(TABLE_EXTERNAL_LINKS)
    .dropTableIfExists(TABLE_ENTERPRISE_ACCOUNTS)
    .dropTableIfExists(TABLE_ACCOUNT_ROLES)
    .dropTableIfExists(TABLE_ACCOUNTS)
    .dropTableIfExists(TABLE_ROLES)
}
