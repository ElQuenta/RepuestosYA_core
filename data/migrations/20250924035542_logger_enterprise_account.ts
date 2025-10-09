import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- Función get_enterprise_account_json: esta función sirve para obtener la representación JSON
    -- completa de una cuenta empresarial (nit, address, description, enabled y representante).
    CREATE OR REPLACE FUNCTION get_enterprise_account_json(entId int)
    RETURNS json AS $$
    BEGIN
      -- Se valida mediante el WHERE que solo se intente construir el JSON para la entidad solicitada;
      -- si no existe, la función retornará NULL.
      RETURN (
        SELECT json_build_object(
          'id', e.id,
          'nit', e.nit,
          'address', e.address,
          'description', e.description,
          'enabled', e.enabled,
          'representant', json_build_object(
              'name', e.representant,
              'ci', e.representant_ci
          )
        )
        FROM enterprise_accounts e
        WHERE e.id = entId
      );
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Función get_enterprise_account_external_links_json: devuelve los links externos asociados
    -- a una cuenta empresarial como un array JSON (retorna '[]' si no hay links).
    CREATE OR REPLACE FUNCTION get_enterprise_account_external_links_json(
      entId INT
    ) RETURNS json AS $$
        DECLARE
            v_external_links json;
        BEGIN
            -- Se valida/normaliza el resultado con COALESCE para evitar devolver NULL cuando no existan links.
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  'link_id', e.id,
                  'name', e.name,
                  'url', e.link
                )
              ),
              '[]'::json
            )
            INTO v_external_links
            FROM external_links e
            WHERE e.enterprise_id = entId;

            RETURN v_external_links;
        END;
    $$ LANGUAGE plpgsql;  
  `);

  await knex.raw(`
    -- Procedimiento sp_logger_enterprise_account: centraliza el guardado de logs relacionados
    -- a cuentas empresariales en la tabla enterprise_log.
    CREATE OR REPLACE PROCEDURE sp_logger_enterprise_account(
      p_enterprise_account_id IN INTEGER,
      p_action IN TEXT,
      p_metadata IN json
    ) LANGUAGE plpgsql AS $$
    BEGIN
        -- En esta parte del Procedimiento se genera el registro/payload/log insertándolo en enterprise_log.
        INSERT INTO enterprise_log (enterprise_id, action, metadata)
        VALUES (p_enterprise_account_id, p_action, p_metadata);
    END;
    $$;
  `);

  await knex.raw(`
    -- Función create_enterprise: crea una cuenta empresarial, inserta links externos opcionales,
    -- construye el payload con enterprise + external_links y registra la creación.
    CREATE OR REPLACE FUNCTION create_enterprise(
        p_nit TEXT,
        p_address TEXT,
        p_representant TEXT,
        p_representant_ci TEXT,
        p_account_id INTEGER DEFAULT NULL,
        p_description TEXT DEFAULT NULL,
        p_links json DEFAULT '[]'::json
    ) RETURNS json as $$
        DECLARE
            v_new_id integer;
            v_registered json;
            v_external_links json;
            v_metadata json;
        BEGIN
            -- Se valida que la cuenta asociada exista para evitar relaciones inválidas.
            -- Nota: si p_account_id es NULL, la condición actual dará como no existente y lanzará excepción.
            IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
                RAISE EXCEPTION 'Account % does not exist', p_account_id;
            END IF;

            -- Inserta la nueva enterprise_account y captura el id generado.
            INSERT INTO enterprise_accounts(nit, address, description, representant, representant_ci, account_id)
            VALUES (p_nit,p_address,p_description,p_representant,p_representant_ci,p_account_id)
            RETURNING id INTO v_new_id;

            -- Se valida que p_links sea un array JSON no vacío antes de insertar registros en external_links.
            IF p_links IS NOT NULL AND json_typeof(p_links) = 'array' AND json_array_length(p_links) > 0 THEN
              INSERT INTO external_links (name, link, enterprise_id)
              SELECT (elem->>'name')::text, (elem->>'link')::text, v_new_id
              FROM json_array_elements(p_links) AS elem;
            END IF;

            -- Recupera la representación actual de la entidad y sus links para construir el payload.
            SELECT get_enterprise_account_json(v_new_id) INTO v_registered;
            SELECT get_enterprise_account_external_links_json(v_new_id) INTO v_external_links;

            v_metadata := json_build_object('enterprise', v_registered, 'external_links', v_external_links);

            -- En esta parte de la Función se genera el registro/payload/log llamando al procedimiento logger.
            CALL sp_logger_enterprise_account(v_new_id,'created',v_metadata);

            RETURN v_metadata;
        END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Procedimiento add_external_link: añade un link externo a una empresa y registra la acción.
    CREATE OR REPLACE PROCEDURE add_external_link(
      p_enterprise_id INTEGER,
      p_name TEXT,
      p_link TEXT
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_external_links json;
      v_metadata json;
      v_enterprise_account json;
    BEGIN
      -- Se valida que la cuenta empresarial exista para evitar insertar links apuntando a entidades inexistentes.
      IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
        RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
      END IF;

      -- Inserta el nuevo link externo.
      INSERT INTO external_links (name, link, enterprise_id)
      VALUES (p_name, p_link, p_enterprise_id);

      -- Recupera la entidad y sus links actualizados.
      SELECT get_enterprise_account_json(p_enterprise_id) INTO v_enterprise_account;
      SELECT get_enterprise_account_external_links_json(p_enterprise_id) INTO v_external_links;

      v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'external_link_added'.
      CALL sp_logger_enterprise_account(p_enterprise_id,'external_link_added',v_metadata);
    END;
    $$;
  `);

  await knex.raw(`
    -- Procedimiento remove_external_link: elimina un link externo y registra la acción.
    CREATE OR REPLACE PROCEDURE remove_external_link(
      p_link_id INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_external_links json;
      v_metadata json;
      v_enterprise_account json;
      v_enterprise_id INTEGER;
    BEGIN
      -- Se valida que el link exista antes de intentar eliminarlo para evitar inconsistencias.
      IF NOT EXISTS (SELECT 1 FROM external_links WHERE id = p_link_id) THEN
        RAISE EXCEPTION 'External Link % does not exist', p_link_id;
      END IF;

      -- Recupera el enterprise_id antes de borrar el link.
      SELECT enterprise_id INTO v_enterprise_id FROM external_links WHERE id = p_link_id;

      -- Elimina el link.
      DELETE FROM external_links WHERE id = p_link_id;

      -- Recupera la entidad y los links restantes para construir el payload.
      SELECT get_enterprise_account_json(v_enterprise_id) INTO v_enterprise_account;
      SELECT get_enterprise_account_external_links_json(v_enterprise_id) INTO v_external_links;

      v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'external_link_removed'.
      CALL sp_logger_enterprise_account(v_enterprise_id,'external_link_removed',v_metadata);
    END;
    $$;
  `);

  await knex.raw(`
    -- Procedimiento update_external_link: actualiza un link externo (uso de COALESCE para evitar NULLs)
    -- y registra la actualización.
    CREATE OR REPLACE PROCEDURE update_external_link(
      p_link_id INTEGER,
      p_name text DEFAULT NULL,
      p_link text DEFAULT NULL
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_external_links json;
      v_metadata json;
      v_enterprise_account json;
      v_enterprise_id INTEGER;
    BEGIN
      -- Se valida que el link exista antes de actualizar.
      IF NOT EXISTS (SELECT 1 FROM external_links WHERE id = p_link_id) THEN
        RAISE EXCEPTION 'External Link % does not exist', p_link_id;
      END IF;

      -- Actualiza usando COALESCE para no sobrescribir con NULL si no se pasan parámetros.
      UPDATE external_links
      SET
        name = COALESCE(p_name, name),
        link = COALESCE(p_link, link)
      WHERE id = p_link_id;

      -- Recupera el enterprise_id y los datos actualizados.
      SELECT enterprise_id INTO v_enterprise_id FROM external_links WHERE id = p_link_id;

      SELECT get_enterprise_account_json(v_enterprise_id) INTO v_enterprise_account;
      SELECT get_enterprise_account_external_links_json(v_enterprise_id) INTO v_external_links;

      v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'external_link_updated'.
      CALL sp_logger_enterprise_account(v_enterprise_id,'external_link_updated',v_metadata);
    END;
    $$;
  `);

  await knex.raw(`
    -- Función update_enterprise_account: actualiza campos selectivos de la cuenta empresarial,
    -- valida la existencia y registra la actualización.
    CREATE OR REPLACE FUNCTION update_enterprise_account(
      p_enterprise_id integer,
      p_enabled boolean DEFAULT NULL,
      p_NIT text DEFAULT NULL,
      p_address text DEFAULT NULL,
      p_description text DEFAULT NULL,
      p_representant text DEFAULT NULL,
      p_representant_CI text DEFAULT NULL,
      p_account_id integer DEFAULT NULL
    ) RETURNS json AS $$
    DECLARE
      v_external_links json;
      v_metadata json;
      v_enterprise_account json;
    BEGIN
      -- Se valida que la cuenta empresarial exista antes de actualizar.
      IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
        RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
      END IF;

      -- Si se recibe account_id, se valida que exista para evitar referencias inválidas.
      IF p_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
        RAISE EXCEPTION 'Account % does not exist', p_account_id;
      END IF;

      -- Uso de COALESCE para mantener valores previos cuando los parámetros son NULL, evitando sobrescribir con NULL.
      UPDATE enterprise_accounts
      SET
        nit = COALESCE(p_NIT, nit),
        address = COALESCE(p_address, address),
        description = COALESCE(p_description, description),
        enabled = COALESCE(p_enabled, enabled),
        representant = COALESCE(p_representant, representant),
        representant_CI = COALESCE(p_representant_CI, representant_CI),
        account_id = COALESCE(p_account_id, account_id)
      WHERE id = p_enterprise_id;

      -- Recupera la entidad y sus links actualizados para construir el payload.
      SELECT get_enterprise_account_json(p_enterprise_id) INTO v_enterprise_account;
      SELECT get_enterprise_account_external_links_json(p_enterprise_id) INTO v_external_links;

      v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

      -- En esta parte de la Función se genera el registro/payload/log con la acción 'updated'.
      CALL sp_logger_enterprise_account(p_enterprise_id,'updated',v_metadata);

      RETURN v_metadata;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Función trigger fn_delete_enterprise_account: genera un log antes de que una cuenta empresarial
    -- sea eliminada (obtiene snapshot OLD + links asociados).
    CREATE OR REPLACE FUNCTION fn_delete_enterprise_account()
    RETURNS trigger AS $$
    DECLARE
        v_external_links json;
        v_metadata json;
        v_enterprise_account json;
    BEGIN
        -- Recupera la representación actual (OLD) de la entidad y sus links antes de la eliminación.
        SELECT get_enterprise_account_json(OLD.id) INTO v_enterprise_account;
        SELECT get_enterprise_account_external_links_json(OLD.id) INTO v_external_links;

        v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

        -- En esta parte del Trigger se genera el registro/payload/log previo a la eliminación.
        CALL sp_logger_enterprise_account(OLD.id,'deleted',v_metadata);

        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Trigger trg_delete_enterpise_account: se ejecuta BEFORE DELETE ON enterprise_accounts para delegar
    -- la creación del log en fn_delete_enterprise_account.
    DROP TRIGGER IF EXISTS trg_delete_enterpise_account ON enterprise_accounts;
    CREATE TRIGGER trg_delete_enterpise_account
    BEFORE DELETE ON enterprise_accounts
    FOR EACH ROW
    EXECUTE FUNCTION fn_delete_enterprise_account();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_delete_enterpise_account ON enterprise_accounts;
    DROP FUNCTION IF EXISTS fn_delete_enterprise_account();
    DROP FUNCTION IF EXISTS update_enterprise_account(
      integer, text, text, text, text, text, integer
    );
    DROP PROCEDURE IF EXISTS update_external_link(integer, text, text);
    DROP PROCEDURE IF EXISTS remove_external_link(integer);
    DROP PROCEDURE IF EXISTS add_external_link(integer, text, text);
    DROP FUNCTION IF EXISTS create_enterprise(
      text, text, text, text, integer, text, json
    );
    DROP PROCEDURE IF EXISTS sp_logger_enterprise_account(integer, text, json);
    DROP FUNCTION IF EXISTS get_enterprise_account_external_links_json(int);
    DROP FUNCTION IF EXISTS get_enterprise_account_json(int);
  `);
}

