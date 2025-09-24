import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION after_insert_account_save()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_product_name text;
    BEGIN
      SELECT name INTO v_product_name FROM products WHERE id = NEW.product_id LIMIT 1;

      INSERT INTO account_save_log (product_id, account_id, action, metadata, created_at, updated_at)
      VALUES (
        NEW.product_id,
        NEW.account_id,
        'save_created',
        to_json(v_product_name),
        now(),
        now()
      );

      RETURN NEW;
    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION after_delete_account_save()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_product_name text;
    BEGIN
      SELECT name INTO v_product_name FROM products WHERE id = OLD.product_id LIMIT 1;

      INSERT INTO account_save_log (product_id, account_id, action, metadata, created_at, updated_at)
      VALUES (
        OLD.product_id,
        OLD.account_id,
        'save_deleted',
        to_json(v_product_name),
        now(),
        now()
      );

      RETURN OLD;
    END;
    $$;
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_after_insert_account_save ON account_saves;
    CREATE TRIGGER trg_after_insert_account_save
      AFTER INSERT ON account_saves
      FOR EACH ROW
      EXECUTE FUNCTION after_insert_account_save();
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_after_delete_account_save ON account_saves;
    CREATE TRIGGER trg_after_delete_account_save
      AFTER DELETE ON account_saves
      FOR EACH ROW
      EXECUTE FUNCTION after_delete_account_save();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_after_insert_account_save ON account_saves;
    DROP TRIGGER IF EXISTS trg_after_delete_account_save ON account_saves;

    DROP FUNCTION IF EXISTS after_insert_account_save();
    DROP FUNCTION IF EXISTS after_delete_account_save();
  `);
}
