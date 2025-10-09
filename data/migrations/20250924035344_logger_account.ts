import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- Función get_account_json: esta función sirve para obtener la representación JSON básica
    -- de una cuenta (id, username, email, cellphone_num).
    CREATE OR REPLACE FUNCTION get_account_json(accountId int)
    RETURNS json AS $$
    BEGIN
    -- Se valida mediante el WHERE que solo se intente construir el JSON para la cuenta solicitada;
    -- si no existe, la función retornará NULL.
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
    -- Función get_account_roles_json: esta función devuelve los roles asociados a una cuenta
    -- como un array JSON (puede ser '[]' si no hay roles).
    CREATE OR REPLACE FUNCTION get_account_roles_json(accountId int)
    RETURNS json as $$
      DECLARE
        v_roles_json json;
      BEGIN
        -- Se valida/normaliza el resultado con COALESCE para evitar devolver NULL cuando no hay roles.
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
    -- Procedimiento sp_logger_account: este procedimiento sirve para centralizar el guardado
    -- de logs relacionados a cuentas en la tabla account_log.
    CREATE OR REPLACE PROCEDURE sp_logger_account(
      p_account_id IN INT,
      p_action IN TEXT,
      p_metadata IN json
    )
    LANGUAGE plpgsql AS $$
      BEGIN
        -- En esta parte del Procedimiento se genera el registro/payload/log insertándolo en account_log.
        INSERT INTO account_log (account_id, action, metadata)
        VALUES (p_account_id, p_action, p_metadata);
      END;
    $$;
  `);

  await knex.raw(`
    -- Función create_account: esta función sirve para crear una nueva cuenta, asociar roles opcionales
    -- y devolver el payload JSON con usuario y roles; además registra la creación con sp_logger_account.
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
        -- Inserta el nuevo registro en accounts y captura el id generado.
        INSERT INTO accounts (username, email, password, cellphone_num)
        VALUES (p_username, p_email, p_password, p_cellphone_num)
        RETURNING id INTO v_new_id;

        -- Se valida si p_roles NO es NULL y tiene longitud para evitar errores al desanidar un arreglo vacío/nulo.
        IF array_length(p_roles, 1) IS NOT NULL THEN
        -- Se valida existencia de cada role_id en roles para evitar insertar relaciones con roles inexistentes.
        INSERT INTO account_roles (account_id, role_id)
        SELECT v_new_id, r_id
        FROM unnest(p_roles) AS r_id
        WHERE EXISTS (SELECT 1 FROM roles WHERE id = r_id)
        ON CONFLICT DO NOTHING;
        END IF;

        -- Recupera roles y datos del usuario recién creado.
        SELECT get_account_roles_json(v_new_id) INTO v_roles_json;

        SELECT get_account_json(v_new_id) INTO v_registered;

        -- Construye el metadata/payload que será registrado en la bitácora.
        v_metadata := json_build_object('user', v_registered, 'roles', v_roles_json);

        -- En esta parte de la Función se genera el registro/payload/log llamando al procedimiento logger.
        CALL sp_logger_account(v_new_id,'created',v_metadata);

        RETURN v_metadata;
      END;
    $$ LANGUAGE plpgsql; 
  `);

  await knex.raw(`
    -- Procedimiento add_role_to_account: sirve para añadir un rol a una cuenta existente
    -- y registrar la acción en account_log.
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
      -- Se valida que la cuenta exista para evitar problemas con registros inexistentes.
      IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
      RAISE EXCEPTION 'Account % does not exist', p_account_id;
      END IF;

      -- Se valida que el rol exista para evitar asociar roles inexistentes.
      IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_role_id) THEN
      RAISE EXCEPTION 'Role % does not exist', p_role_id;
      END IF;

      -- Inserta la relación account_roles (si ya existe, no hace nada por ON CONFLICT DO NOTHING).
      INSERT INTO account_roles (account_id, role_id)
      VALUES (p_account_id, p_role_id)
      ON CONFLICT DO NOTHING;

      -- Recupera el estado actual de roles y usuario.
      SELECT get_account_roles_json(p_account_id) INTO v_roles_json;

      SELECT get_account_json(p_account_id) INTO v_user_data;

      v_metadata := json_build_object('user', v_user_data, 'roles', v_roles_json);

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'role_added'.
      CALL sp_logger_account(p_account_id, 'role_added', v_metadata);
    END;
    $$;
  `);

  await knex.raw(`
    -- Procedimiento remove_role_from_account: sirve para eliminar un rol asociado a una cuenta
    -- y registrar la acción correspondiente.
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
          -- Se valida que la relación account_roles exista para evitar intentar eliminar algo que no está.
          IF NOT EXISTS (SELECT 1 FROM public.account_roles WHERE account_id = p_account_id AND role_id = p_role_id) THEN
          RAISE EXCEPTION 'Account % does have the role', p_account_id;
          END IF;

          -- Elimina la relación role-account.
          DELETE FROM account_roles
          WHERE account_id = p_account_id AND role_id = p_role_id;

          -- Recupera roles y datos actualizados del usuario.
          SELECT get_account_roles_json(p_account_id) INTO v_roles_json;

          SELECT get_account_json(p_account_id) INTO v_user_data;

          v_metadata := json_build_object('user', v_user_data, 'roles', v_roles_json);

          -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'role_removed'.
          CALL sp_logger_account(p_account_id, 'role_removed', v_metadata);
        END;
      $$; 
  `);

  await knex.raw(`
    -- Función update_account: sirve para actualizar campos selectivos de una cuenta
    -- (usa COALESCE para no sobrescribir con NULL) y registra la actualización.
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
        -- Se valida que la cuenta exista antes de intentar actualizar.
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
        RAISE EXCEPTION 'Account % does not exist', p_account_id;
        END IF;

        -- Uso de COALESCE para mantener el valor antiguo cuando el parámetro es NULL:
        -- Se valida/evita sobrescribir columnas con valores NULL no intencionales.
        UPDATE accounts
        SET
          username = COALESCE(p_username, username),
          email = COALESCE(p_email, email),
          password = COALESCE(p_password, password),
          cellphone_num = COALESCE(p_cellphone_num, cellphone_num)
        WHERE id = p_account_id;

        -- Recupera roles y usuario actualizado.
        SELECT get_account_roles_json(p_account_id) INTO v_roles_json;

        SELECT get_account_json(p_account_id) INTO v_user_data;

        v_metadata := json_build_object('user', v_user_data, 'roles', v_roles_json);

        -- En esta parte de la Función se genera el registro/payload/log con la acción 'update'.
        CALL sp_logger_account(p_account_id, 'update', v_metadata);

        RETURN v_metadata;
      END;
    $$ Language plpgsql;  
  `)

  await knex.raw(`
    -- Función trigger fn_delete_account: sirve para generar un registro/log cuando una cuenta se elimina.
    CREATE OR REPLACE FUNCTION fn_delete_account()
    RETURNS trigger AS $$
    DECLARE
      v_roles_json json;
      v_metadata json;
      v_user_data json;
    BEGIN
      -- Recupera roles del registro OLD (antes de borrarlo).
      SELECT get_account_roles_json(OLD.id) INTO v_roles_json;

        SELECT get_account_json(OLD.id) INTO v_user_data;

        v_metadata := json_build_object('user', v_user_data, 'roles', v_roles_json);

        -- En esta parte del Trigger se genera el registro/payload/log antes de la eliminación definitiva.
        CALL sp_logger_account(OLD.id, 'deleted', v_metadata);
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Trigger trg_delete_account: se ejecuta BEFORE DELETE ON accounts para delegar en fn_delete_account
    -- la creación del log de eliminación.
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

