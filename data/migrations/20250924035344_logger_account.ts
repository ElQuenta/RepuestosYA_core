import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_account_json(accountId int)
    RETURNS json AS $$
    BEGIN
    RETURN (
      SELECT json_build_object(
      'id', id,
      'username', username,
      'email', email,
      'cellphone_num', cellphone_num
      )
      FROM accounts
      WHERE id = accountId
    );
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_account_roles_json(accountId int)
    RETURNS json as $$
      DECLARE
        v_roles_json json;
      BEGIN
        SELECT COALESCE(json_agg(json_build_object('role_id', r.id, 'role', r.name)), '[]'::json)
        INTO v_roles_json
        FROM roles r
        JOIN account_roles ar ON ar.role_id = r.id
        WHERE ar.account_id = accountId;

        RETURN v_roles_json;
      END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE sp_logger_account(
      p_account_id IN INT,
      p_action IN TEXT,
      p_metadata IN json
    )
    LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO account_log (account_id, action, metadata)
        VALUES (p_account_id, p_action, p_metadata);
      END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION create_account(
      p_username text,
      p_email text,
      p_password text,
      p_cellphone_num text,
      p_roles integer[] DEFAULT ARRAY[]::integer[]
    )
    RETURNS json AS $$
      DECLARE
        v_new_id integer;
        v_registered json;
        v_roles_json json;
        v_metadata json;
      BEGIN
        INSERT INTO accounts (username, email, password, cellphone_num)
        VALUES (p_username, p_email, p_password, p_cellphone_num)
        RETURNING id INTO v_new_id;

        IF array_length(p_roles, 1) IS NOT NULL THEN
        INSERT INTO account_roles (account_id, role_id)
        SELECT v_new_id, r_id
        FROM unnest(p_roles) AS r_id
        WHERE EXISTS (SELECT 1 FROM roles WHERE id = r_id)
        ON CONFLICT DO NOTHING;
        END IF;

        SELECT get_account_roles_json(v_new_id) INTO v_roles_json;

        SELECT get_account_json(v_new_id) INTO v_registered;

        v_metadata := json_build_object('user', v_registered, 'roles', v_roles_json);

        CALL sp_logger_account(v_new_id,'created',v_metadata);

        RETURN v_metadata;
      END;
    $$ LANGUAGE plpgsql; 
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE add_role_to_account(
      p_account_id integer,
      p_role_id integer
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_roles_json json;
      v_metadata json;
      v_user_data text;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
      RAISE EXCEPTION 'Account % does not exist', p_account_id;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_role_id) THEN
      RAISE EXCEPTION 'Role % does not exist', p_role_id;
      END IF;

      INSERT INTO account_roles (account_id, role_id)
      VALUES (p_account_id, p_role_id)
      ON CONFLICT DO NOTHING;

      SELECT get_account_roles_json(p_account_id) INTO v_roles_json;

      SELECT get_account_json(p_account_id) INTO v_user_data;

      v_metadata := json_build_object('user', v_user_data, 'roles', v_roles_json);

      CALL sp_logger_account(p_account_id, 'role_added', v_metadata);
    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE remove_role_from_account(
      p_account_id integer,
      p_role_id integer
      )
      LANGUAGE plpgsql
      AS $$
        DECLARE
          v_roles_json json;
          v_metadata json;
          v_user_data text;
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM public.account_roles WHERE account_id = p_account_id AND role_id = p_role_id) THEN
          RAISE EXCEPTION 'Account % does have the role', p_account_id;
          END IF;

          DELETE FROM account_roles
          WHERE account_id = p_account_id AND role_id = p_role_id;

          SELECT get_account_roles_json(p_account_id) INTO v_roles_json;

          SELECT get_account_json(p_account_id) INTO v_user_data;

          v_metadata := json_build_object('user', v_user_data, 'roles', v_roles_json);

          CALL sp_logger_account(p_account_id, 'role_removed', v_metadata);
        END;
      $$; 
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_account (
      p_account_id INTEGER,
      p_username TEXT DEFAULT NULL,
      p_email TEXT DEFAULT NULL,
      p_password TEXT DEFAULT NULL,
      p_cellphone_num TEXT DEFAULT NULL
    ) RETURNS json AS $$
      DECLARE
        v_roles_json json;
        v_metadata json;
        v_user_data text;
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
        RAISE EXCEPTION 'Account % does not exist', p_account_id;
        END IF;

        UPDATE accounts
        SET
          username = COALESCE(p_username, username),
          email = COALESCE(p_email, email),
          password = COALESCE(p_password, password),
          cellphone_num = COALESCE(p_cellphone_num, cellphone_num)
        WHERE id = p_account_id;

        SELECT get_account_roles_json(p_account_id) INTO v_roles_json;

        SELECT get_account_json(p_account_id) INTO v_user_data;

        v_metadata := json_build_object('user', v_user_data, 'roles', v_roles_json);

        CALL sp_logger_account(p_account_id, 'update', v_metadata);

        RETURN v_metadata;
      END;
    $$ Language plpgsql;  
  `)

  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_delete_account()
    RETURNS trigger AS $$
    DECLARE
      v_roles_json json;
      v_metadata json;
      v_user_data json;
    BEGIN
      SELECT get_account_roles_json(OLD.id) INTO v_roles_json;

        SELECT get_account_json(OLD.id) INTO v_user_data;

        v_metadata := json_build_object('user', v_user_data, 'roles', v_roles_json);

        CALL sp_logger_account(OLD.id, 'deleted', v_metadata);
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_delete_account ON accounts;
    CREATE TRIGGER trg_delete_account
    BEFORE DELETE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION fn_delete_account();  
  `)
}


export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP FUNCTION IF EXISTS get_account_json(int);
    DROP FUNCTION IF EXISTS get_account_roles_json(int);
    DROP PROCEDURE IF EXISTS sp_logger_account(int, text, json);
    DROP FUNCTION IF EXISTS create_account(text, text, text, text, integer[]);
    DROP PROCEDURE IF EXISTS add_role_to_account(integer, integer);
    DROP PROCEDURE IF EXISTS remove_role_from_account(integer, integer);
    DROP FUNCTION IF EXISTS update_account(integer, text, text, text, text);
    DROP TRIGGER IF EXISTS trg_delete_account ON accounts;
    DROP FUNCTION IF EXISTS fn_delete_account();
  `);
}

