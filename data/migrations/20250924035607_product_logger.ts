import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
  CREATE OR REPLACE PROCEDURE create_product_with_details(
    p_name text,
    p_enterprise_id integer,
    p_stock integer DEFAULT 0,
    p_category_ids integer[] DEFAULT ARRAY[]::integer[],
    p_car_model_ids integer[] DEFAULT ARRAY[]::integer[],
    p_images json DEFAULT '[]'::json
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_product_id integer;
    v_elem json;
    v_img_id integer;
    v_categories_json json;
    v_images_json json;
    v_car_models_json json;
    v_enterprise_name text;
    v_enterprise_nit text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
      RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
    END IF;

    INSERT INTO products (name, stock, enterprise_id)
    VALUES (p_name, p_stock, p_enterprise_id)
    RETURNING id INTO v_product_id;

    IF array_length(p_category_ids, 1) IS NOT NULL THEN
      INSERT INTO product_category_rel (product_id, category_id)
      SELECT v_product_id, c_id
      FROM unnest(p_category_ids) AS c_id
      WHERE EXISTS (SELECT 1 FROM product_categories WHERE id = c_id)
      ON CONFLICT DO NOTHING;
    END IF;

    IF array_length(p_car_model_ids, 1) IS NOT NULL THEN
      INSERT INTO product_car_models (product_id, car_model_id)
      SELECT v_product_id, cm_id
      FROM unnest(p_car_model_ids) AS cm_id
      WHERE EXISTS (SELECT 1 FROM car_models WHERE id = cm_id)
      ON CONFLICT DO NOTHING;
    END IF;

    IF p_images IS NOT NULL AND json_typeof(p_images) = 'array' AND json_array_length(p_images) > 0 THEN
      FOR v_elem IN SELECT * FROM json_array_elements(p_images)
      LOOP
        BEGIN
          INSERT INTO images (url)
          VALUES ((v_elem->>'url')::text)
          RETURNING id INTO v_img_id;
        EXCEPTION WHEN unique_violation THEN
          SELECT id INTO v_img_id FROM images WHERE url = (v_elem->>'url')::text LIMIT 1;
        END;

        INSERT INTO product_images (product_id, image_id)
        VALUES (v_product_id, v_img_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
    INTO v_categories_json
    FROM product_categories pc
    JOIN product_category_rel pcr ON pcr.category_id = pc.id
    WHERE pcr.product_id = v_product_id;

    SELECT COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url)), '[]'::json)
    INTO v_images_json
    FROM images i
    JOIN product_images pi ON pi.image_id = i.id
    WHERE pi.product_id = v_product_id;

    SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
    INTO v_car_models_json
    FROM car_models cm
    JOIN product_car_models pcm ON pcm.car_model_id = cm.id
    WHERE pcm.product_id = v_product_id;

    SELECT COALESCE(a.username, ea.representant), ea.nit
    INTO v_enterprise_name, v_enterprise_nit
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = p_enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata)
    VALUES (
      v_product_id,
      'created',
      json_build_object(
        'id', v_product_id,
        'name', p_name,
        'stock', p_stock,
        'enterprise_id', p_enterprise_id,
        'enterprise_name', v_enterprise_name,
        'enterprise_nit', v_enterprise_nit,
        'categories', v_categories_json,
        'images', v_images_json,
        'car_models', v_car_models_json
      )
    );
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE add_image_to_product(
    p_product_id integer,
    p_url text
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_img_id integer;
    v_images_json json;
    v_product_name text;
    v_enterprise_id integer;
    v_enterprise_name text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
      RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;

    BEGIN
      INSERT INTO images (url)
      VALUES (p_url)
      RETURNING id INTO v_img_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_img_id FROM images WHERE url = p_url LIMIT 1;
    END;

    INSERT INTO product_images (product_id, image_id)
    VALUES (p_product_id, v_img_id)
    ON CONFLICT DO NOTHING;

    SELECT COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url)), '[]'::json)
    INTO v_images_json
    FROM images i
    JOIN product_images pi ON pi.image_id = i.id
    WHERE pi.product_id = p_product_id;

    SELECT name, enterprise_id INTO v_product_name, v_enterprise_id FROM products WHERE id = p_product_id;
    SELECT COALESCE(a.username, ea.representant) INTO v_enterprise_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata)
    VALUES (
      p_product_id,
      'image_added',
      json_build_object('product_name', v_product_name, 'enterprise_name', v_enterprise_name, 'images', v_images_json)
    );
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE remove_image_from_product(
    p_product_id integer,
    p_image_id integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_images_json json;
    v_product_name text;
    v_enterprise_id integer;
    v_enterprise_name text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
      RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;

    DELETE FROM product_images WHERE product_id = p_product_id AND image_id = p_image_id;

    SELECT COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url)), '[]'::json)
    INTO v_images_json
    FROM images i
    JOIN product_images pi ON pi.image_id = i.id
    WHERE pi.product_id = p_product_id;

    SELECT name, enterprise_id INTO v_product_name, v_enterprise_id FROM products WHERE id = p_product_id;
    SELECT COALESCE(a.username, ea.representant) INTO v_enterprise_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata)
    VALUES (
      p_product_id,
      'image_removed',
      json_build_object('product_name', v_product_name, 'enterprise_name', v_enterprise_name, 'images', v_images_json)
    );
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE add_category_to_product(
    p_product_id integer,
    p_category_id integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_categories_json json;
    v_product_name text;
    v_enterprise_id integer;
    v_enterprise_name text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
      RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM product_categories WHERE id = p_category_id) THEN
      RAISE EXCEPTION 'Product category % does not exist', p_category_id;
    END IF;

    INSERT INTO product_category_rel (product_id, category_id)
    VALUES (p_product_id, p_category_id)
    ON CONFLICT DO NOTHING;

    SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
    INTO v_categories_json
    FROM product_categories pc
    JOIN product_category_rel pcr ON pcr.category_id = pc.id
    WHERE pcr.product_id = p_product_id;

    SELECT name, enterprise_id INTO v_product_name, v_enterprise_id FROM products WHERE id = p_product_id;
    SELECT COALESCE(a.username, ea.representant) INTO v_enterprise_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata)
    VALUES (
      p_product_id,
      'category_added',
      json_build_object('product_name', v_product_name, 'enterprise_name', v_enterprise_name, 'categories', v_categories_json)
    );
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE remove_category_from_product(
    p_product_id integer,
    p_category_id integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_categories_json json;
    v_product_name text;
    v_enterprise_id integer;
    v_enterprise_name text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
      RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;

    DELETE FROM product_category_rel
    WHERE product_id = p_product_id AND category_id = p_category_id;

    SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
    INTO v_categories_json
    FROM product_categories pc
    JOIN product_category_rel pcr ON pcr.category_id = pc.id
    WHERE pcr.product_id = p_product_id;

    SELECT name, enterprise_id INTO v_product_name, v_enterprise_id FROM products WHERE id = p_product_id;
    SELECT COALESCE(a.username, ea.representant) INTO v_enterprise_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata)
    VALUES (
      p_product_id,
      'category_removed',
      json_build_object('product_name', v_product_name, 'enterprise_name', v_enterprise_name, 'categories', v_categories_json)
    );
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE add_car_model_to_product(
    p_product_id integer,
    p_car_model_id integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_car_models_json json;
    v_product_name text;
    v_enterprise_id integer;
    v_enterprise_name text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
      RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM car_models WHERE id = p_car_model_id) THEN
      RAISE EXCEPTION 'Car model % does not exist', p_car_model_id;
    END IF;

    INSERT INTO product_car_models (product_id, car_model_id)
    VALUES (p_product_id, p_car_model_id)
    ON CONFLICT DO NOTHING;

    SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
    INTO v_car_models_json
    FROM car_models cm
    JOIN product_car_models pcm ON pcm.car_model_id = cm.id
    WHERE pcm.product_id = p_product_id;

    SELECT name, enterprise_id INTO v_product_name, v_enterprise_id FROM products WHERE id = p_product_id;
    SELECT COALESCE(a.username, ea.representant) INTO v_enterprise_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata)
    VALUES (
      p_product_id,
      'car_model_added',
      json_build_object('product_name', v_product_name, 'enterprise_name', v_enterprise_name, 'car_models', v_car_models_json)
    );
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE remove_car_model_from_product(
    p_product_id integer,
    p_car_model_id integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_car_models_json json;
    v_product_name text;
    v_enterprise_id integer;
    v_enterprise_name text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
      RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;

    DELETE FROM product_car_models
    WHERE product_id = p_product_id AND car_model_id = p_car_model_id;

    SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
    INTO v_car_models_json
    FROM car_models cm
    JOIN product_car_models pcm ON pcm.car_model_id = cm.id
    WHERE pcm.product_id = p_product_id;

    SELECT name, enterprise_id INTO v_product_name, v_enterprise_id FROM products WHERE id = p_product_id;
    SELECT COALESCE(a.username, ea.representant) INTO v_enterprise_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata)
    VALUES (
      p_product_id,
      'car_model_removed',
      json_build_object('product_name', v_product_name, 'enterprise_name', v_enterprise_name, 'car_models', v_car_models_json)
    );
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE patch_product(
    p_product_id integer,
    p_name text DEFAULT NULL,
    p_enterprise_id integer DEFAULT NULL
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_categories_json json;
    v_images_json json;
    v_car_models_json json;
    v_product_row RECORD;
    v_enterprise_name text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
      RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;

    IF p_enterprise_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
      RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
    END IF;

    UPDATE products
    SET
      name = COALESCE(p_name, name),
      enterprise_id = COALESCE(p_enterprise_id, enterprise_id)
    WHERE id = p_product_id;

    SELECT * INTO v_product_row FROM products WHERE id = p_product_id LIMIT 1;

    SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
    INTO v_categories_json
    FROM product_categories pc
    JOIN product_category_rel pcr ON pcr.category_id = pc.id
    WHERE pcr.product_id = p_product_id;

    SELECT COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url)), '[]'::json)
    INTO v_images_json
    FROM images i
    JOIN product_images pi ON pi.image_id = i.id
    WHERE pi.product_id = p_product_id;

    SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
    INTO v_car_models_json
    FROM car_models cm
    JOIN product_car_models pcm ON pcm.car_model_id = cm.id
    WHERE pcm.product_id = p_product_id;

    SELECT COALESCE(a.username, ea.representant) INTO v_enterprise_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_product_row.enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata)
    VALUES (
      p_product_id,
      'patched',
      json_build_object(
        'id', v_product_row.id,
        'name', v_product_row.name,
        'stock', v_product_row.stock,
        'enterprise_id', v_product_row.enterprise_id,
        'enterprise_name', v_enterprise_name,
        'categories', v_categories_json,
        'images', v_images_json,
        'car_models', v_car_models_json
      )
    );
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE PROCEDURE update_product_stock(
    p_product_id integer,
    p_new_stock integer
  )
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_product_name text;
    v_enterprise_id integer;
    v_enterprise_name text;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
      RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;

    UPDATE products SET stock = p_new_stock, updated_at = now() WHERE id = p_product_id;

    SELECT name, enterprise_id INTO v_product_name, v_enterprise_id FROM products WHERE id = p_product_id;
    SELECT COALESCE(a.username, ea.representant) INTO v_enterprise_name
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = v_enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata, created_at, updated_at)
    VALUES (
      p_product_id,
      'stock_updated',
      json_build_object(
        'product_name', v_product_name,
        'enterprise_name', v_enterprise_name,
        'stock', p_new_stock
      ),
      now(),
      now()
    );
  END;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE FUNCTION after_delete_product_log()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_categories_json json;
    v_images_json json;
    v_car_models_json json;
    v_enterprise_name text;
    v_enterprise_nit text;
  BEGIN
    SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
    INTO v_categories_json
    FROM product_categories pc
    JOIN product_category_rel pcr ON pcr.category_id = pc.id
    WHERE pcr.product_id = OLD.id;

    SELECT COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url)), '[]'::json)
    INTO v_images_json
    FROM images i
    JOIN product_images pi ON pi.image_id = i.id
    WHERE pi.product_id = OLD.id;

    SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
    INTO v_car_models_json
    FROM car_models cm
    JOIN product_car_models pcm ON pcm.car_model_id = cm.id
    WHERE pcm.product_id = OLD.id;

    SELECT COALESCE(a.username, ea.representant), ea.nit INTO v_enterprise_name, v_enterprise_nit
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = OLD.enterprise_id
    LIMIT 1;

    INSERT INTO product_log (product_id, action, metadata)
    VALUES (
      OLD.id,
      'deleted',
      json_build_object(
        'id', OLD.id,
        'name', OLD.name,
        'stock', OLD.stock,
        'enterprise_id', OLD.enterprise_id,
        'enterprise_name', v_enterprise_name,
        'enterprise_nit', v_enterprise_nit,
        'categories', v_categories_json,
        'images', v_images_json,
        'car_models', v_car_models_json
      )
    );

    RETURN OLD;
  END;
  $$;
  `);

  // create trigger
  await knex.raw(`
  DROP TRIGGER IF EXISTS trg_after_delete_product_log ON products;
  CREATE TRIGGER trg_after_delete_product_log
    AFTER DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION after_delete_product_log();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_after_delete_product_log ON products;
    DROP FUNCTION IF EXISTS after_delete_product_log();

    DROP PROCEDURE IF EXISTS update_product_stock(integer, integer);
    DROP PROCEDURE IF EXISTS patch_product(integer, text, integer);
    DROP PROCEDURE IF EXISTS remove_car_model_from_product(integer, integer);
    DROP PROCEDURE IF EXISTS add_car_model_to_product(integer, integer);
    DROP PROCEDURE IF EXISTS remove_category_from_product(integer, integer);
    DROP PROCEDURE IF EXISTS add_category_to_product(integer, integer);
    DROP PROCEDURE IF EXISTS remove_image_from_product(integer, integer);
    DROP PROCEDURE IF EXISTS add_image_to_product(integer, text);
    DROP PROCEDURE IF EXISTS create_product_with_details(text, integer, integer, integer[], integer[], json);
  `);
}
