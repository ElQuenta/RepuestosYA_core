import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_enterprise_account_json(entId int)
    RETURNS json AS $$
    BEGIN
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
    CREATE OR REPLACE FUNCTION get_enterprise_account_external_links_json(
      entId INT
    ) RETURNS json AS $$
        DECLARE
            v_external_links json;
        BEGIN
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
    CREATE OR REPLACE PROCEDURE sp_logger_enterprise_account(
      p_enterprise_account_id IN INTEGER,
      p_action IN TEXT,
      p_metadata IN json
    ) LANGUAGE plpgsql AS $$
    BEGIN
        INSERT INTO enterprise_log (enterprise_id, action, metadata)
        VALUES (p_enterprise_account_id, p_action, p_metadata);
    END;
    $$;
  `);

  await knex.raw(`
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
            IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
                RAISE EXCEPTION 'Account % does not exist', p_account_id;
            END IF;

            INSERT INTO enterprise_accounts(nit, address, description, representant, representant_ci, account_id)
            VALUES (p_nit,p_address,p_description,p_representant,p_representant_ci,p_account_id)
            RETURNING id INTO v_new_id;

            IF p_links IS NOT NULL AND json_typeof(p_links) = 'array' AND json_array_length(p_links) > 0 THEN
              INSERT INTO external_links (name, link, enterprise_id)
              SELECT (elem->>'name')::text, (elem->>'link')::text, v_new_id
              FROM json_array_elements(p_links) AS elem;
            END IF;

            SELECT get_enterprise_account_json(v_new_id) INTO v_registered;
            SELECT get_enterprise_account_external_links_json(v_new_id) INTO v_external_links;

            v_metadata := json_build_object('enterprise', v_registered, 'external_links', v_external_links);

            CALL sp_logger_enterprise_account(v_new_id,'created',v_metadata);

            RETURN v_metadata;
        END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
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
      IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
        RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
      END IF;

      INSERT INTO external_links (name, link, enterprise_id)
      VALUES (p_name, p_link, p_enterprise_id);

      SELECT get_enterprise_account_json(p_enterprise_id) INTO v_enterprise_account;
      SELECT get_enterprise_account_external_links_json(p_enterprise_id) INTO v_external_links;

      v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

      CALL sp_logger_enterprise_account(p_enterprise_id,'external_link_added',v_metadata);
    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE remove_external_link(
      p_link_id INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_external_links json;
      v_metadata json;
      v_enterprise_account json;
      v_enterprise_id INTEGER;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM external_links WHERE id = p_link_id) THEN
        RAISE EXCEPTION 'External Link % does not exist', p_link_id;
      END IF;

      SELECT enterprise_id INTO v_enterprise_id FROM external_links WHERE id = p_link_id;

      DELETE FROM external_links WHERE id = p_link_id;

      SELECT get_enterprise_account_json(v_enterprise_id) INTO v_enterprise_account;
      SELECT get_enterprise_account_external_links_json(v_enterprise_id) INTO v_external_links;

      v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

      CALL sp_logger_enterprise_account(v_enterprise_id,'external_link_removed',v_metadata);
    END;
    $$;
  `);

  await knex.raw(`
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
      IF NOT EXISTS (SELECT 1 FROM external_links WHERE id = p_link_id) THEN
        RAISE EXCEPTION 'External Link % does not exist', p_link_id;
      END IF;

      UPDATE external_links
      SET
        name = COALESCE(p_name, name),
        link = COALESCE(p_link, link)
      WHERE id = p_link_id;

      SELECT enterprise_id INTO v_enterprise_id FROM external_links WHERE id = p_link_id;

      SELECT get_enterprise_account_json(v_enterprise_id) INTO v_enterprise_account;
      SELECT get_enterprise_account_external_links_json(v_enterprise_id) INTO v_external_links;

      v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

      CALL sp_logger_enterprise_account(v_enterprise_id,'external_link_updated',v_metadata);
    END;
    $$;
  `);

  await knex.raw(`
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
      IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
        RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
      END IF;

      IF p_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
        RAISE EXCEPTION 'Account % does not exist', p_account_id;
      END IF;

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

      SELECT get_enterprise_account_json(p_enterprise_id) INTO v_enterprise_account;
      SELECT get_enterprise_account_external_links_json(p_enterprise_id) INTO v_external_links;

      v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

      CALL sp_logger_enterprise_account(p_enterprise_id,'updated',v_metadata);

      RETURN v_metadata;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_delete_enterprise_account()
    RETURNS trigger AS $$
    DECLARE
        v_external_links json;
        v_metadata json;
        v_enterprise_account json;
    BEGIN
        SELECT get_enterprise_account_json(OLD.id) INTO v_enterprise_account;
        SELECT get_enterprise_account_external_links_json(OLD.id) INTO v_external_links;

        v_metadata := json_build_object('enterprise', v_enterprise_account, 'external_links', v_external_links);

        CALL sp_logger_enterprise_account(OLD.id,'deleted',v_metadata);

        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
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

