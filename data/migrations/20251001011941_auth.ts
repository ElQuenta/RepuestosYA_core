import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION register_enterprise_account(
      p_username text,
      p_email text,
      p_password text,
      p_cellphone_num text,
      p_nit text,
      p_address text,
      p_representant text,
      p_representant_ci text,
      p_roles integer[] DEFAULT ARRAY[]::integer[],
      p_description text DEFAULT NULL,
      p_links json DEFAULT '[]'::json
    ) RETURNS json AS $$
    DECLARE
      v_account_json json;
      v_enterprise_account_json json;
      v_account_id integer;
      v_user_obj json;
      v_enterprise_obj json;
      v_metadata json;
    BEGIN
      v_account_json := create_account(p_username, p_email, p_password, p_cellphone_num, p_roles);

      IF v_account_json IS NULL OR v_account_json -> 'user' IS NULL THEN
        RAISE EXCEPTION 'create_account did not return user object';
      END IF;

      BEGIN
        v_account_id := (v_account_json -> 'user' ->> 'id')::integer;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Could not extract account id from create_account result: %', v_account_json::text;
      END;

      v_enterprise_account_json := create_enterprise(
        p_nit,
        p_address,
        p_representant,
        p_representant_ci,
        v_account_id,
        p_description,
        p_links
      );

      v_user_obj := (
        COALESCE((v_account_json -> 'user')::jsonb, '{}'::jsonb)
        ||
        jsonb_build_object('roles', COALESCE((v_account_json -> 'roles')::jsonb, '[]'::jsonb))
      )::json;

      v_enterprise_obj := (
        COALESCE((v_enterprise_account_json -> 'enterprise')::jsonb, '{}'::jsonb)
        ||
        jsonb_build_object('external_links', COALESCE((v_enterprise_account_json -> 'external_links')::jsonb, '[]'::jsonb))
      )::json;

      v_metadata := json_build_object(
        'user', v_user_obj,
        'enterprise', v_enterprise_obj
      );

      RETURN v_metadata;
    END;
    $$ LANGUAGE plpgsql;
  `)

  await knex.raw(`
    CREATE OR REPLACE FUNCTION register_account(
      p_username text,
      p_email text,
      p_password text,
      p_cellphone_num text,
      p_roles integer[] DEFAULT ARRAY[]::integer[]
    ) RETURNS json AS $$
    DECLARE
      v_account_json json;
      v_account_id integer;
      v_user_obj json;
      v_metadata json;
    BEGIN
      v_account_json := create_account(p_username, p_email, p_password, p_cellphone_num, p_roles);

      IF v_account_json IS NULL OR v_account_json -> 'user' IS NULL THEN
        RAISE EXCEPTION 'create_account did not return user object';
      END IF;

      BEGIN
        v_account_id := (v_account_json -> 'user' ->> 'id')::integer;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Could not extract account id from create_account result: %', v_account_json::text;
      END;

      v_user_obj := (
        COALESCE((v_account_json -> 'user')::jsonb, '{}'::jsonb)
        ||
        jsonb_build_object('roles', COALESCE((v_account_json -> 'roles')::jsonb, '[]'::jsonb))
      )::json;

      v_metadata := json_build_object(
        'user', v_user_obj
      );

      RETURN v_metadata;
    END;
    $$ LANGUAGE plpgsql;  
  `)

  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_account_by_email(
      p_email TEXT
    ) RETURNS json AS $$
      DECLARE
        v_account_json json;
        v_roles_json json;
        v_enterprise_account_json json;
        v_external_links_json json;
        v_metadata json;
        v_account_id integer;
        v_enterprise_id integer;
        v_password text;
        v_user_obj json;
        v_enterprise_obj json;
      BEGIN
        SELECT id INTO v_account_id FROM accounts WHERE email = p_email LIMIT 1;
        IF v_account_id IS NULL THEN
          RAISE EXCEPTION 'Account with email % does not exist', p_email;
        END IF;

        SELECT id INTO v_enterprise_id FROM enterprise_accounts WHERE account_id = v_account_id LIMIT 1;

        SELECT get_account_json(v_account_id) INTO v_account_json;
        SELECT get_account_roles_json(v_account_id) INTO v_roles_json;

        IF v_enterprise_id IS NOT NULL THEN
          SELECT get_enterprise_account_json(v_enterprise_id) INTO v_enterprise_account_json;
          SELECT get_enterprise_account_external_links_json(v_enterprise_id) INTO v_external_links_json;
        ELSE
          v_enterprise_account_json := NULL;
          v_external_links_json := '[]'::json;
        END IF;

        SELECT password INTO v_password FROM accounts WHERE id = v_account_id;

        v_user_obj := (
          COALESCE(v_account_json::jsonb, '{}'::jsonb)
          || jsonb_build_object(
              'roles', COALESCE(v_roles_json::jsonb, '[]'::jsonb),
              'password', v_password
            )
        )::json;

        IF v_enterprise_account_json IS NOT NULL THEN
          v_enterprise_obj := (
            COALESCE(v_enterprise_account_json::jsonb, '{}'::jsonb)
            || jsonb_build_object('external_links', COALESCE(v_external_links_json::jsonb, '[]'::jsonb))
          )::json;
        ELSE
          v_enterprise_obj := null;
        END IF;

        v_metadata := json_build_object(
          'user', v_user_obj,
          'enterprise', v_enterprise_obj
        );

        RETURN v_metadata;
      END;
    $$ LANGUAGE plpgsql;
  `)
}


export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP FUNCTION IF EXISTS register_enterprise_account
      (text, text, text, text, text, text, text, text, integer[], text, json);
    DROP FUNCTION IF EXISTS register_account
      (text, text, text, text, integer[]);
    DROP FUNCTION IF EXISTS get_account_by_email(TEXT);
  `);
}

