import type { Knex } from 'knex';

const TABLE_PRODUCTS = 'products';
const TABLE_ACCOUNT_SAVES = 'account_saves';
const TABLE_CAR_MODELS = 'car_models';
const TABLE_PRODUCT_CAR_MODELS = 'product_car_models';
const TABLE_PRODUCT_CATEGORIES = 'product_categories';
const TABLE_PRODUCT_CATEGORY_REL = 'product_category_rel';
const TABLE_BRANDS = 'brands';
const TABLE_PRODUCT_BRANDS = 'product_brands';
const TABLE_IMAGES = 'images';
const TABLE_PRODUCT_IMAGES = 'product_images';

const TABLE_ACCOUNTS = 'accounts';
const TABLE_ENTERPRISE_ACCOUNTS = 'enterprise_accounts';

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable(TABLE_PRODUCTS, function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.integer('stock').notNullable().defaultTo(0);
      table
        .integer('enterprise_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_ENTERPRISE_ACCOUNTS)
        .onDelete('CASCADE');
      table.timestamps(true, true);
    })

    .createTable(TABLE_ACCOUNT_SAVES, function (table) {
      table
        .integer('account_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_ACCOUNTS)
        .onDelete('CASCADE');
      table
        .integer('product_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_PRODUCTS)
        .onDelete('CASCADE');
      table.primary(['account_id', 'product_id']);
      table.timestamps(true, true);
    })

    .createTable(TABLE_CAR_MODELS, function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.timestamps(true, true);
    })

    .createTable(TABLE_PRODUCT_CAR_MODELS, function (table) {
      table
        .integer('product_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_PRODUCTS)
        .onDelete('CASCADE');
      table
        .integer('car_model_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_CAR_MODELS)
        .onDelete('CASCADE');
      table.primary(['product_id', 'car_model_id']);
      table.timestamps(true, true);
    })

    .createTable(TABLE_PRODUCT_CATEGORIES, function (table) {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.timestamps(true, true);
    })

    .createTable(TABLE_PRODUCT_CATEGORY_REL, function (table) {
      table
        .integer('product_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_PRODUCTS)
        .onDelete('CASCADE');
      table
        .integer('category_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_PRODUCT_CATEGORIES)
        .onDelete('CASCADE');
      table.primary(['product_id', 'category_id']);
      table.timestamps(true, true);
    })

    .createTable(TABLE_BRANDS, function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.timestamps(true, true);
    })

    .createTable(TABLE_PRODUCT_BRANDS, function (table) {
      table
        .integer('product_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_PRODUCTS)
        .onDelete('CASCADE');
      table
        .integer('branch_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_BRANDS)
        .onDelete('CASCADE');
      table.primary(['product_id', 'branch_id']);
      table.timestamps(true, true);
    })

    .createTable(TABLE_IMAGES, function (table) {
      table.increments('id').primary();
      table.string('url').notNullable();
      table.timestamps(true, true);
    })

    .createTable(TABLE_PRODUCT_IMAGES, function (table) {
      table
        .integer('product_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_PRODUCTS)
        .onDelete('CASCADE');
      table
        .integer('image_id')
        .unsigned()
        .references('id')
        .inTable(TABLE_IMAGES)
        .onDelete('CASCADE');
      table.primary(['product_id', 'image_id']);
      table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .dropTableIfExists(TABLE_PRODUCT_IMAGES)
    .dropTableIfExists(TABLE_IMAGES)
    .dropTableIfExists(TABLE_PRODUCT_BRANDS)
    .dropTableIfExists(TABLE_BRANDS)
    .dropTableIfExists(TABLE_PRODUCT_CATEGORY_REL)
    .dropTableIfExists(TABLE_PRODUCT_CATEGORIES)
    .dropTableIfExists(TABLE_PRODUCT_CAR_MODELS)
    .dropTableIfExists(TABLE_CAR_MODELS)
    .dropTableIfExists(TABLE_ACCOUNT_SAVES)
    .dropTableIfExists(TABLE_PRODUCTS);
}
