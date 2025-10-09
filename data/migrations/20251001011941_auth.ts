import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- Función register_enterprise_account: sirve para registrar una cuenta de usuario
    -- y crear automáticamente su cuenta empresarial asociada (enterprise_account).
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
      -- Llama a la función create_account para crear el usuario y captura su resultado.
      v_account_json := create_account(p_username, p_email, p_password, p_cellphone_num, p_roles);

      -- Se valida que create_account haya devuelto un objeto con la clave 'user'.
      IF v_account_json IS NULL OR v_account_json -> 'user' IS NULL THEN
        RAISE EXCEPTION 'create_account did not return user object';
      END IF;

      -- Extrae el account id del resultado de create_account; maneja errores de conversión.
      BEGIN
        v_account_id := (v_account_json -> 'user' ->> 'id')::integer;
      EXCEPTION WHEN invalid_text_representation THEN
        -- Se valida que el id sea convertible a entero; si falla, se informa con el payload completo.
        RAISE EXCEPTION 'Could not extract account id from create_account result: %', v_account_json::text;
      END;

      -- Crea la enterprise asociada usando el account_id recien creado.
      v_enterprise_account_json := create_enterprise(
        p_nit,
        p_address,
        p_representant,
        p_representant_ci,
        v_account_id,
        p_description,
        p_links
      );

      -- Construye el objeto 'user' combinando user + roles (normalizando a {} / [] si es necesario).
      v_user_obj := (
        COALESCE((v_account_json -> 'user')::jsonb, '{}'::jsonb)
        ||
        jsonb_build_object('roles', COALESCE((v_account_json -> 'roles')::jsonb, '[]'::jsonb))
      )::json;

      -- Construye el objeto 'enterprise' combinando enterprise + external_links (normalizando).
      v_enterprise_obj := (
        COALESCE((v_enterprise_account_json -> 'enterprise')::jsonb, '{}'::jsonb)
        ||
        jsonb_build_object('external_links', COALESCE((v_enterprise_account_json -> 'external_links')::jsonb, '[]'::jsonb))
      )::json;

      -- En esta parte de la Función se genera el payload/metadata que será retornado al caller.
      v_metadata := json_build_object(
        'user', v_user_obj,
        'enterprise', v_enterprise_obj
      );

      RETURN v_metadata;
    END;
    $$ LANGUAGE plpgsql;
  `)

  await knex.raw(`
    -- Función register_account: sirve para registrar solo la cuenta de usuario (sin enterprise)
    -- y devolver un payload normalizado con user + roles.
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
      -- Llama a create_account y captura su resultado.
      v_account_json := create_account(p_username, p_email, p_password, p_cellphone_num, p_roles);

      -- Se valida que create_account haya devuelto un objeto con 'user'.
      IF v_account_json IS NULL OR v_account_json -> 'user' IS NULL THEN
        RAISE EXCEPTION 'create_account did not return user object';
      END IF;

      -- Extrae account id con control de errores de conversión.
      BEGIN
        v_account_id := (v_account_json -> 'user' ->> 'id')::integer;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Could not extract account id from create_account result: %', v_account_json::text;
      END;

      -- Construye el objeto 'user' normalizando roles.
      v_user_obj := (
        COALESCE((v_account_json -> 'user')::jsonb, '{}'::jsonb)
        ||
        jsonb_build_object('roles', COALESCE((v_account_json -> 'roles')::jsonb, '[]'::jsonb))
      )::json;

      -- En esta parte de la Función se genera el payload/metadata que será retornado.
      v_metadata := json_build_object(
        'user', v_user_obj
      );

      RETURN v_metadata;
    END;
    $$ LANGUAGE plpgsql;  
  `)

  await knex.raw(`
    -- Función get_account_by_email: retorna un payload completo (user + enterprise) dado un email.
    -- Utiliza funciones auxiliares para construir snapshots y también incluye la contraseña en el objeto user.
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
        -- Busca el id de la cuenta por email; se valida existencia.
        SELECT id INTO v_account_id FROM accounts WHERE email = p_email LIMIT 1;
        IF v_account_id IS NULL THEN
          RAISE EXCEPTION 'Account with email % does not exist', p_email;
        END IF;

        -- Busca si existe una enterprise asociada a la cuenta.
        SELECT id INTO v_enterprise_id FROM enterprise_accounts WHERE account_id = v_account_id LIMIT 1;

        -- Recupera snapshots del usuario y sus roles.
        SELECT get_account_json(v_account_id) INTO v_account_json;
        SELECT get_account_roles_json(v_account_id) INTO v_roles_json;

        -- Si existe enterprise, recupera su snapshot y sus links; si no, normaliza valores.
        IF v_enterprise_id IS NOT NULL THEN
          SELECT get_enterprise_account_json(v_enterprise_id) INTO v_enterprise_account_json;
          SELECT get_enterprise_account_external_links_json(v_enterprise_id) INTO v_external_links_json;
        ELSE
          v_enterprise_account_json := NULL;
          v_external_links_json := '[]'::json;
        END IF;

        -- Recupera la contraseña (campo sensible) desde la tabla accounts.
        SELECT password INTO v_password FROM accounts WHERE id = v_account_id;

        -- Construye el objeto user incluyendo roles y password (normaliza a {} / [] si hace falta).
        v_user_obj := (
          COALESCE(v_account_json::jsonb, '{}'::jsonb)
          || jsonb_build_object(
              'roles', COALESCE(v_roles_json::jsonb, '[]'::jsonb),
              'password', v_password
            )
        )::json;

        -- Construye el objeto enterprise si existe; normaliza external_links.
        IF v_enterprise_account_json IS NOT NULL THEN
          v_enterprise_obj := (
            COALESCE(v_enterprise_account_json::jsonb, '{}'::jsonb)
            || jsonb_build_object('external_links', COALESCE(v_external_links_json::jsonb, '[]'::jsonb))
          )::json;
        ELSE
          v_enterprise_obj := null;
        END IF;

        -- En esta parte de la Función se genera el payload/metadata final que será retornado.
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
    -- Limpia las funciones creadas en up.
    DROP FUNCTION IF EXISTS register_enterprise_account
      (text, text, text, text, text, text, text, text, integer[], text, json);
    DROP FUNCTION IF EXISTS register_account
      (text, text, text, text, integer[]);
    DROP FUNCTION IF EXISTS get_account_by_email(TEXT);
  `);
}

