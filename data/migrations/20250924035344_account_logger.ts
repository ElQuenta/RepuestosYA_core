import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
  CREATE OR REPLACE PROCEDURE create_account_with_roles(
    p_username text,
    p_email text,
    p_password text,
    p_cellphone_num text,
    p_roles integer[] DEFAULT ARRAY[]::integer[]
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_new_id integer;
    v_roles_json json;
    v_registered json;
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

    SELECT COALESCE(json_agg(json_build_object('role_id', r.id, 'role', r.name)), '[]'::json)
    INTO v_roles_json
    FROM roles r
    JOIN account_roles ar ON ar.role_id = r.id
    WHERE ar.account_id = v_new_id;

    v_registered := json_build_object(
      'id', v_new_id,
      'username', p_username,
      'email', p_email,
      'cellphone_num', p_cellphone_num
    );

    v_metadata := json_build_object('registered', v_registered, 'roles', v_roles_json);

    INSERT INTO account_log (account_id, action, metadata)
    VALUES (v_new_id, 'created', v_metadata);
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE add_role_to_account(
    p_account_id integer,
    p_role_id integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_exists boolean;
    v_roles_json json;
    v_metadata json;
    v_user_email text;
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

    SELECT COALESCE(json_agg(json_build_object('role_id', r.id, 'role', r.name)), '[]'::json)
    INTO v_roles_json
    FROM roles r
    JOIN account_roles ar ON ar.role_id = r.id
    WHERE ar.account_id = p_account_id;

    SELECT email INTO v_user_email FROM accounts WHERE id = p_account_id;

    v_metadata := json_build_object('id', p_account_id, 'email', v_user_email, 'roles', v_roles_json);

    INSERT INTO account_log (account_id, action, metadata)
    VALUES (p_account_id, 'role_added', v_metadata);
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
    v_user_email text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
      RAISE EXCEPTION 'Account % does not exist', p_account_id;
    END IF;

    DELETE FROM account_roles
    WHERE account_id = p_account_id AND role_id = p_role_id;

    SELECT COALESCE(json_agg(json_build_object('role_id', r.id, 'role', r.name)), '[]'::json)
    INTO v_roles_json
    FROM roles r
    JOIN account_roles ar ON ar.role_id = r.id
    WHERE ar.account_id = p_account_id;

    SELECT email INTO v_user_email FROM accounts WHERE id = p_account_id;

    v_metadata := json_build_object('id', p_account_id, 'email', v_user_email, 'roles', v_roles_json);

    INSERT INTO account_log (account_id, action, metadata)
    VALUES (p_account_id, 'role_removed', v_metadata);
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE FUNCTION after_delete_account_log_if_no_metadata()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_has_nonnull_metadata boolean;
    v_roles_json json;
    v_metadata json;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM account_log
      WHERE account_id = OLD.id AND metadata IS NOT NULL
    ) INTO v_has_nonnull_metadata;

    IF NOT v_has_nonnull_metadata THEN
      SELECT COALESCE(json_agg(json_build_object('role_id', r.id, 'role', r.name)), '[]'::json)
      INTO v_roles_json
      FROM roles r
      JOIN account_roles ar ON ar.role_id = r.id
      WHERE ar.account_id = OLD.id;

      v_metadata := json_build_object(
        'id', OLD.id,
        'username', OLD.username,
        'email', OLD.email,
        'cellphone_num', OLD.cellphone_num,
        'roles', v_roles_json
      );

      INSERT INTO account_log (account_id, action, metadata)
      VALUES (OLD.id, 'deleted', v_metadata);
    END IF;

    RETURN OLD;
  END;
  $$;
  `);

  await knex.raw(`
  DROP TRIGGER IF EXISTS trg_after_delete_account_log_if_no_metadata ON accounts;
  CREATE TRIGGER trg_after_delete_account_log_if_no_metadata
    AFTER DELETE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION after_delete_account_log_if_no_metadata();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_after_delete_account_log_if_no_metadata ON accounts;
    DROP FUNCTION IF EXISTS after_delete_account_log_if_no_metadata();
    DROP PROCEDURE IF EXISTS remove_role_from_account(integer, integer);
    DROP PROCEDURE IF EXISTS add_role_to_account(integer, integer);
    DROP PROCEDURE IF EXISTS create_account_with_roles(text, text, text, text, integer[]);
  `);
}
