import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
  CREATE OR REPLACE PROCEDURE create_enterprise_with_links(
    p_NIT text,
    p_address text,
    p_representant text,
    p_representant_CI text,
    p_account_id integer DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_links json DEFAULT '[]'::json
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_new_id integer;
    v_links_json json;
    v_metadata json;
    v_account_name text;
  BEGIN
    IF p_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id) THEN
      RAISE EXCEPTION 'Account % does not exist', p_account_id;
    END IF;

    INSERT INTO enterprise_accounts
      (nit, address, description, representant, representant_ci, enabled, account_id)
    VALUES
      (p_NIT, p_address, p_description, p_representant, p_representant_CI, true, p_account_id)
    RETURNING id INTO v_new_id;

    IF p_links IS NOT NULL AND json_typeof(p_links) = 'array' AND json_array_length(p_links) > 0 THEN
      INSERT INTO external_links (name, link, enterprise_id)
      SELECT (elem->>'name')::text, (elem->>'link')::text, v_new_id
      FROM json_array_elements(p_links) AS elem;
    END IF;

    SELECT COALESCE(json_agg(json_build_object('id', el.id, 'name', el.name, 'link', el.link)), '[]'::json)
    INTO v_links_json
    FROM external_links el
    WHERE el.enterprise_id = v_new_id;

    v_account_name := p_representant;
    IF p_account_id IS NOT NULL THEN
      SELECT a.username INTO v_account_name FROM accounts a WHERE a.id = p_account_id LIMIT 1;
      IF v_account_name IS NULL THEN
        v_account_name := p_representant;
      END IF;
    END IF;

    v_metadata := json_build_object(
      'id', v_new_id,
      'nit', p_NIT,
      'address', p_address,
      'description', p_description,
      'representant', p_representant,
      'representant_CI', p_representant_CI,
      'account_id', p_account_id,
      'name', v_account_name,
      'links', v_links_json
    );

    INSERT INTO enterprise_log (enterprise_id, action, metadata)
    VALUES (v_new_id, 'created', v_metadata);
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE add_external_link(
    p_enterprise_id integer,
    p_name text,
    p_link text
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_links_json json;
    v_metadata json;
    v_account_name text;
    v_nit text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
      RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
    END IF;

    INSERT INTO external_links (name, link, enterprise_id)
    VALUES (p_name, p_link, p_enterprise_id);

    SELECT COALESCE(json_agg(json_build_object('id', el.id, 'name', el.name, 'link', el.link)), '[]'::json)
    INTO v_links_json
    FROM external_links el
    WHERE el.enterprise_id = p_enterprise_id;

    SELECT ea.nit, COALESCE(a.username, ea.representant) INTO v_nit, v_account_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = p_enterprise_id
    LIMIT 1;

    v_metadata := json_build_object(
      'id', p_enterprise_id,
      'nit', v_nit,
      'name', v_account_name,
      'links', v_links_json
    );

    INSERT INTO enterprise_log (enterprise_id, action, metadata)
    VALUES (p_enterprise_id, 'external_link_added', v_metadata);
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE remove_external_link(
    p_link_id integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_enterprise_id integer;
    v_links_json json;
    v_metadata json;
    v_account_name text;
    v_nit text;
  BEGIN
    SELECT enterprise_id INTO v_enterprise_id FROM external_links WHERE id = p_link_id;
    IF v_enterprise_id IS NULL THEN
      RAISE EXCEPTION 'External link % does not exist', p_link_id;
    END IF;

    DELETE FROM external_links WHERE id = p_link_id;

    SELECT COALESCE(json_agg(json_build_object('id', el.id, 'name', el.name, 'link', el.link)), '[]'::json)
    INTO v_links_json
    FROM external_links el
    WHERE el.enterprise_id = v_enterprise_id;

    SELECT ea.nit, COALESCE(a.username, ea.representant) INTO v_nit, v_account_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_enterprise_id
    LIMIT 1;

    v_metadata := json_build_object(
      'id', v_enterprise_id,
      'nit', v_nit,
      'name', v_account_name,
      'links', v_links_json
    );

    INSERT INTO enterprise_log (enterprise_id, action, metadata)
    VALUES (v_enterprise_id, 'external_link_removed', v_metadata);
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE update_external_link(
    p_link_id integer,
    p_name text DEFAULT NULL,
    p_link text DEFAULT NULL
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_enterprise_id integer;
    v_links_json json;
    v_metadata json;
    v_account_name text;
    v_nit text;
  BEGIN
    SELECT enterprise_id INTO v_enterprise_id FROM external_links WHERE id = p_link_id;
    IF v_enterprise_id IS NULL THEN
      RAISE EXCEPTION 'External link % does not exist', p_link_id;
    END IF;

    UPDATE external_links
    SET
      name = COALESCE(p_name, name),
      link = COALESCE(p_link, link)
    WHERE id = p_link_id;

    SELECT COALESCE(json_agg(json_build_object('id', el.id, 'name', el.name, 'link', el.link)), '[]'::json)
    INTO v_links_json
    FROM external_links el
    WHERE el.enterprise_id = v_enterprise_id;

    SELECT ea.nit, COALESCE(a.username, ea.representant) INTO v_nit, v_account_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_enterprise_id
    LIMIT 1;

    v_metadata := json_build_object(
      'id', v_enterprise_id,
      'nit', v_nit,
      'name', v_account_name,
      'links', v_links_json
    );

    INSERT INTO enterprise_log (enterprise_id, action, metadata)
    VALUES (v_enterprise_id, 'external_link_updated', v_metadata);
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE patch_enterprise_account(
    p_enterprise_id integer,
    p_NIT text DEFAULT NULL,
    p_address text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_representant text DEFAULT NULL,
    p_representant_CI text DEFAULT NULL,
    p_account_id integer DEFAULT NULL
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_links_json json;
    v_metadata json;
    v_account_name text;
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
      representant = COALESCE(p_representant, representant),
      representant_CI = COALESCE(p_representant_CI, representant_CI),
      account_id = COALESCE(p_account_id, account_id)
    WHERE id = p_enterprise_id;

    SELECT COALESCE(json_agg(json_build_object('id', el.id, 'name', el.name, 'link', el.link)), '[]'::json)
    INTO v_links_json
    FROM external_links el
    WHERE el.enterprise_id = p_enterprise_id;

    SELECT COALESCE(a.username, ea.representant) INTO v_account_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = p_enterprise_id
    LIMIT 1;

    v_metadata := json_build_object(
      'id', p_enterprise_id,
      'nit', (SELECT nit FROM enterprise_accounts WHERE id = p_enterprise_id),
      'address', (SELECT address FROM enterprise_accounts WHERE id = p_enterprise_id),
      'description', (SELECT description FROM enterprise_accounts WHERE id = p_enterprise_id),
      'representant', (SELECT representant FROM enterprise_accounts WHERE id = p_enterprise_id),
      'representant_CI', (SELECT representant_CI FROM enterprise_accounts WHERE id = p_enterprise_id),
      'account_id', (SELECT account_id FROM enterprise_accounts WHERE id = p_enterprise_id),
      'name', v_account_name,
      'links', v_links_json
    );

    INSERT INTO enterprise_log (enterprise_id, action, metadata)
    VALUES (p_enterprise_id, 'updated', v_metadata);
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE enable_enterprise_account(
    p_enterprise_id integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_nit text;
    v_name text;
    v_metadata json;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
      RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
    END IF;

    UPDATE enterprise_accounts SET enabled = true WHERE id = p_enterprise_id;

    SELECT nit, COALESCE(a.username, ea.representant) INTO v_nit, v_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = p_enterprise_id
    LIMIT 1;

    v_metadata := json_build_object('id', p_enterprise_id, 'nit', v_nit, 'name', v_name, 'enabled', true);

    INSERT INTO enterprise_log (enterprise_id, action, metadata)
    VALUES (p_enterprise_id, 'enabled', v_metadata);
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE disable_enterprise_account(
    p_enterprise_id integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_nit text;
    v_name text;
    v_metadata json;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
      RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
    END IF;

    UPDATE enterprise_accounts SET enabled = false WHERE id = p_enterprise_id;

    SELECT nit, COALESCE(a.username, ea.representant) INTO v_nit, v_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = p_enterprise_id
    LIMIT 1;

    v_metadata := json_build_object('id', p_enterprise_id, 'nit', v_nit, 'name', v_name, 'enabled', false);

    INSERT INTO enterprise_log (enterprise_id, action, metadata)
    VALUES (p_enterprise_id, 'disabled', v_metadata);
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE FUNCTION after_delete_enterprise_log()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_links_json json;
    v_account_name text;
    v_metadata json;
  BEGIN
    SELECT COALESCE(json_agg(json_build_object('id', el.id, 'name', el.name, 'link', el.link)), '[]'::json)
    INTO v_links_json
    FROM external_links el
    WHERE el.enterprise_id = OLD.id;

    SELECT COALESCE(a.username, OLD.representant) INTO v_account_name
    FROM accounts a
    WHERE a.id = OLD.account_id
    LIMIT 1;

    v_metadata := json_build_object(
      'id', OLD.id,
      'nit', OLD.nit,
      'address', OLD.address,
      'description', OLD.description,
      'representant', OLD.representant,
      'representant_CI', OLD.representant_CI,
      'account_id', OLD.account_id,
      'name', v_account_name,
      'links', v_links_json
    );

    INSERT INTO enterprise_log (enterprise_id, action, metadata)
    VALUES (OLD.id, 'deleted', v_metadata);

    RETURN OLD;
  END;
  $$;
  `);

  await knex.raw(`
  DROP TRIGGER IF EXISTS trg_after_delete_enterprise_log ON enterprise_accounts;
  CREATE TRIGGER trg_after_delete_enterprise_log
    AFTER DELETE ON enterprise_accounts
    FOR EACH ROW
    EXECUTE FUNCTION after_delete_enterprise_log();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_after_delete_enterprise_log ON enterprise_accounts;
    DROP FUNCTION IF EXISTS after_delete_enterprise_log();

    DROP PROCEDURE IF EXISTS disable_enterprise_account(integer);
    DROP PROCEDURE IF EXISTS enable_enterprise_account(integer);
    DROP PROCEDURE IF EXISTS patch_enterprise_account(integer, text, text, text, text, text, integer);
    DROP PROCEDURE IF EXISTS update_external_link(integer, text, text);
    DROP PROCEDURE IF EXISTS remove_external_link(integer);
    DROP PROCEDURE IF EXISTS add_external_link(integer, text, text);
    DROP PROCEDURE IF EXISTS create_enterprise_with_links(text, text, text, text, integer, text, json);
  `);
}
