import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- Función fn_create_save: trigger que registra en account_save_log cuando un usuario guarda un producto.
    -- Sirve como auditoría: crea un snapshot (metadata) con user + product al insertar en account_saves.
    CREATE OR REPLACE FUNCTION fn_create_save()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_product_id INTEGER;
      v_user_id integer;
      v_metadata json;
      v_user_data json;
      v_product_json json;
    BEGIN
      -- Captura los ids del nuevo registro del trigger.
      v_product_id := NEW.product_id;
      v_user_id := NEW.account_id;

      -- Se valida/recupera snapshot del producto; si no existe, get_product_json retornará NULL.
      SELECT get_product_json(v_product_id) INTO v_product_json;
      -- Se valida/recupera snapshot del usuario; si no existe, get_account_json retornará NULL.
      SELECT get_account_json(v_user_id) INTO v_user_data;

      -- En esta parte de la Función se genera el registro/payload/log (user + product).
      v_metadata := json_build_object('user', v_user_data, 'Product', v_product_json);

      -- Inserta el log en account_save_log indicando que se creó un "save".
      INSERT INTO account_save_log (product_id, account_id, action, metadata)
      VALUES (
        NEW.product_id,
        NEW.account_id,
        'save_created',
        v_metadata
      );

      RETURN NEW;
    END;
    $$;
  `);

  await knex.raw(`
    -- Función fn_delete_save: trigger que registra en account_save_log cuando un usuario elimina un "save".
    -- Sirve para auditoría: crea un snapshot (metadata) con user + product al eliminarse la relación.
    CREATE OR REPLACE FUNCTION fn_delete_save()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_product_id INTEGER;
      v_user_id integer;
      v_metadata json;
      v_user_data json;
      v_product_json json;
    BEGIN
      -- Captura los ids del registro OLD (antes de la eliminación).
      v_product_id := OLD.product_id;
      v_user_id := OLD.account_id;

      -- Se valida/recupera snapshot del producto; si no existe, get_product_json retornará NULL.
      SELECT get_product_json(v_product_id) INTO v_product_json;
      -- Se valida/recupera snapshot del usuario; si no existe, get_account_json retornará NULL.
      SELECT get_account_json(v_user_id) INTO v_user_data;

      -- En esta parte de la Función se genera el registro/payload/log (user + product).
      v_metadata := json_build_object('user', v_user_data, 'Product', v_product_json);

      -- Inserta el log en account_save_log indicando que se eliminó un "save".
      INSERT INTO account_save_log (product_id, account_id, action, metadata)
      VALUES (
        OLD.product_id,
        OLD.account_id,
        'save_deleted',
        v_metadata
      );

      RETURN OLD;
    END;
    $$;
  `);

  await knex.raw(`
    -- Trigger trg_create_save: se ejecuta AFTER INSERT ON account_saves para delegar en fn_create_save.
    DROP TRIGGER IF EXISTS trg_create_save ON account_saves;
    CREATE TRIGGER trg_create_save
      AFTER INSERT ON account_saves
      FOR EACH ROW
      EXECUTE FUNCTION fn_create_save();
  `);

  await knex.raw(`
    -- Trigger trg_delete_save: se ejecuta AFTER DELETE ON account_saves para delegar en fn_delete_save.
    DROP TRIGGER IF EXISTS trg_delete_save ON account_saves;
    CREATE TRIGGER trg_delete_save
      AFTER DELETE ON account_saves
      FOR EACH ROW
      EXECUTE FUNCTION fn_delete_save();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_create_save ON account_saves;
    DROP TRIGGER IF EXISTS trg_delete_save ON account_saves;

    DROP FUNCTION IF EXISTS fn_create_save();
    DROP FUNCTION IF EXISTS fn_delete_save();
  `);
}