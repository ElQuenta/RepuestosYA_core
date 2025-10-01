import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_product_json(prodId int)
    RETURNS json AS $$
    BEGIN
      RETURN (
        SELECT json_build_object(
          'id', p.id,
          'name', p.name,
          'stock', p.stock,
          'price', p.price
        )
        FROM products p
        WHERE p.id = prodId
      );
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_product_categories_json(prodId int)
    RETURNS json as $$
      DECLARE
        v_categories_json json;
      BEGIN
        SELECT COALESCE(json_agg(json_build_object('category_id', c.id, 'name', c.name)), '[]'::json)
        INTO v_categories_json
        FROM product_categories c
        JOIN product_category_rel cr ON cr.category_id = c.id
        WHERE cr.product_id = prodId;

        RETURN v_categories_json;
      END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_product_images_json(prodId int)
    RETURNS json as $$
      DECLARE
        v_images_json json;
      BEGIN
        SELECT COALESCE(json_agg(json_build_object('image_id', i.id, 'url', i.url)), '[]'::json)
        INTO v_images_json
        FROM images i
        JOIN product_images p ON p.image_id = i.id
        WHERE p.product_id = prodId;

        RETURN v_images_json;
      END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_product_brands_json(prodId int)
    RETURNS json as $$
      DECLARE
        v_brands_json json;
      BEGIN
        SELECT COALESCE(json_agg(json_build_object('brand_id', b.id, 'name', b.name)), '[]'::json)
        INTO v_brands_json
        FROM brands b
        JOIN product_brands p ON p.brand_id = b.id
        WHERE p.product_id = prodId;

        RETURN v_brands_json;
      END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_product_cars_json(prodId int)
    RETURNS json as $$
      DECLARE
        v_cars_json json;
      BEGIN
        SELECT COALESCE(json_agg(json_build_object('car_id', c.id, 'name', c.name)), '[]'::json)
        INTO v_cars_json
        FROM car_models c
        JOIN product_car_models p ON p.car_model_id = c.id
        WHERE p.product_id = prodId;

        RETURN v_cars_json;
      END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE sp_logger_product(
      p_product_id IN INT,
      p_action IN TEXT,
      p_metadata IN json
    )
    LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO product_log (product_id, action, metadata)
        VALUES (p_product_id, p_action, p_metadata);
      END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION create_product (
      p_name text,
      p_enterprise_id integer,
      p_stock integer DEFAULT 0,
      p_price numeric DEFAULT 0,
      p_category_ids integer[] DEFAULT ARRAY[]::integer[],
      p_car_model_ids integer[] DEFAULT ARRAY[]::integer[],
      p_images json DEFAULT '[]'::json
    ) RETURNS json AS $$
    DECLARE
      v_product_id integer;
      v_product_json json;
      v_categories_json json;
      v_images_json json;
      v_car_models_json json;
      v_brands_json json;
      v_enterprise_json json;
      v_metadata json;
      v_cat_id integer;
      v_car_id integer;
      v_img json;
      v_img_id integer;
      v_img_url text;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
        RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
      END IF;

      INSERT INTO products (name, stock, price, enterprise_id, created_at, updated_at)
        VALUES (p_name, p_stock, p_price, p_enterprise_id, now(), now())
      RETURNING id INTO v_product_id;

      IF array_length(p_category_ids,1) IS NOT NULL THEN
        FOREACH v_cat_id IN ARRAY p_category_ids LOOP
          IF NOT EXISTS (SELECT 1 FROM product_categories WHERE id = v_cat_id) THEN
            RAISE EXCEPTION 'Product category % does not exist', v_cat_id;
          END IF;

          INSERT INTO product_category_rel (product_id, category_id, created_at, updated_at)
          VALUES (v_product_id, v_cat_id, now(), now())
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;

      IF array_length(p_car_model_ids,1) IS NOT NULL THEN
        FOREACH v_car_id IN ARRAY p_car_model_ids LOOP
          IF NOT EXISTS (SELECT 1 FROM car_models WHERE id = v_car_id) THEN
            RAISE EXCEPTION 'Car model % does not exist', v_car_id;
          END IF;

          INSERT INTO product_car_models (product_id, car_model_id, created_at, updated_at)
          VALUES (v_product_id, v_car_id, now(), now())
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;

      IF p_images IS NOT NULL AND json_array_length(p_images) > 0 THEN
        FOR v_img IN SELECT * FROM json_array_elements(p_images) LOOP
          v_img_url := (v_img ->> 'url');
          BEGIN
            v_img_id := NULL;
            IF (v_img ->> 'id') IS NOT NULL AND (v_img ->> 'id') <> '' THEN
              v_img_id := (v_img ->> 'id')::integer;
              IF NOT EXISTS (SELECT 1 FROM images WHERE id = v_img_id) THEN
                RAISE EXCEPTION 'Image id % does not exist', v_img_id;
              END IF;
            ELSE
              IF v_img_url IS NULL OR trim(v_img_url) = '' THEN
                RAISE EXCEPTION 'Image object must contain "id" or non-empty "url"';
              END IF;
              INSERT INTO images (url, created_at, updated_at)
                VALUES (v_img_url, now(), now())
              RETURNING id INTO v_img_id;
            END IF;

            INSERT INTO product_images (product_id, image_id, created_at, updated_at)
            VALUES (v_product_id, v_img_id, now(), now())
            ON CONFLICT DO NOTHING;

          EXCEPTION WHEN others THEN
            RAISE;
          END;
        END LOOP;
      END IF;

      SELECT get_product_json(v_product_id) INTO v_product_json;
      SELECT get_product_categories_json(v_product_id) INTO v_categories_json;
      SELECT get_product_images_json(v_product_id) INTO v_images_json;
      SELECT get_product_cars_json(v_product_id) INTO v_car_models_json;
      SELECT get_product_brands_json(v_product_id) INTO v_brands_json;
      SELECT get_enterprise_account_json(p_enterprise_id) INTO v_enterprise_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'categories', COALESCE(v_categories_json, '[]'::json),
        'images', COALESCE(v_images_json, '[]'::json),
        'car_models', COALESCE(v_car_models_json, '[]'::json),
        'brands', COALESCE(v_brands_json, '[]'::json),
        'enterprise', v_enterprise_json
      );

      CALL sp_logger_product(v_product_id, 'created', v_metadata);

      RETURN v_metadata;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_product(
      p_product_id INTEGER,
      p_name TEXT DEFAULT NULL,
      p_enterprise_id integer DEFAULT NULL,
      p_stock INTEGER DEFAULT NULL,
      p_price NUMERIC DEFAULT NULL
    ) RETURNS json as $$
    DECLARE
      v_product_json json;
      v_enterprise_json json;
      v_metadata json;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
        RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
      END IF;

      UPDATE products
      SET
        name = coalesce(p_name, name),
        price = coalesce(p_price, price),
        stock = coalesce(p_stock, stock),
        enterprise_id = coalesce(p_enterprise_id, enterprise_id)
      WHERE id = p_product_id;

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_enterprise_account_json(coalesce(p_enterprise_id,(select enterprise_id from products where id = p_product_id))) INTO v_enterprise_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'enterprise', v_enterprise_json
      );

      CALL sp_logger_product(p_product_id,'update',v_metadata);

      return v_metadata;

    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE add_new_image(
        p_product_id IN INTEGER,
        p_url IN TEXT
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_images_json json;
      v_metadata json;
      v_img_id INTEGER;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
      END IF;

      INSERT INTO images (url)
      VALUES (p_url) RETURNING id INTO v_img_id;

      INSERT INTO product_images(product_id, image_id)
      VALUES (p_product_id,v_img_id);

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_images_json(p_product_id) INTO v_images_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'images', COALESCE(v_images_json, '[]'::json)
      );

      CALL sp_logger_product(v_product_id, 'image_added', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE add_new_image(
      p_product_id IN INTEGER,
      p_url IN TEXT
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_images_json json;
      v_metadata json;
      v_img_id INTEGER;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
      END IF;

      INSERT INTO images (url)
      VALUES (p_url) RETURNING id INTO v_img_id;

      INSERT INTO product_images(product_id, image_id)
      VALUES (p_product_id,v_img_id);

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_images_json(p_product_id) INTO v_images_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'images', COALESCE(v_images_json, '[]'::json)
      );
      
      CALL sp_logger_product(p_product_id, 'image_added', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE remove_image(
        p_product_id IN INTEGER,
        p_image_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_images_json json;
      v_metadata json;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = p_product_id AND image_id = p_image_id) THEN
        RAISE EXCEPTION 'Relation with product % does not exist', p_product_id;
      END IF;

      DELETE FROM product_images WHERE product_id = p_product_id AND image_id = p_image_id;

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_images_json(p_product_id) INTO v_images_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'images', COALESCE(v_images_json, '[]'::json)
      );

      CALL sp_logger_product(p_product_id, 'image_removed', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE add_car(
      p_product_id IN INTEGER,
      p_car_model_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_car_models_json json;
      v_metadata json;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM car_models WHERE id = p_car_model_id) THEN
        RAISE EXCEPTION 'Car model % does not exist', p_car_model_id;
      END IF;

      INSERT INTO product_car_models (product_id, car_model_id, created_at, updated_at)
      VALUES (p_product_id, p_car_model_id, now(), now())
      ON CONFLICT DO NOTHING;

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_cars_json(p_product_id) INTO v_car_models_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'car_models', COALESCE(v_car_models_json, '[]'::json)
      );

      CALL sp_logger_product(p_product_id, 'car_model_added', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE remove_car(
      p_product_id IN INTEGER,
      p_car_model_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_car_models_json json;
      v_metadata json;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM product_car_models WHERE product_id = p_product_id AND car_model_id = p_car_model_id) THEN
        RAISE EXCEPTION 'Relation with product % does not exist', p_product_id;
      END IF;

      DELETE FROM product_car_models WHERE product_id = p_product_id AND car_model_id = p_car_model_id;

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_cars_json(p_product_id) INTO v_car_models_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'car_models', COALESCE(v_car_models_json, '[]'::json)
      );

      CALL sp_logger_product(p_product_id, 'car_model_removed', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE add_category(
      p_product_id IN INTEGER,
      p_category_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_categories_json json;
      v_metadata json;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM product_categories WHERE id = p_category_id) THEN
        RAISE EXCEPTION 'Product category % does not exist', p_category_id;
      END IF;

      INSERT INTO product_category_rel (product_id, category_id, created_at, updated_at)
      VALUES (p_product_id, p_category_id, now(), now())
      ON CONFLICT DO NOTHING;

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_categories_json(p_product_id) INTO v_categories_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'categories', COALESCE(v_categories_json, '[]'::json)
      );

      CALL sp_logger_product(p_product_id, 'category_added', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE PROCEDURE remove_category(
      p_product_id IN INTEGER,
      p_category_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_categories_json json;
      v_metadata json;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM product_category_rel WHERE product_id = p_product_id AND category_id = p_category_id) THEN
        RAISE EXCEPTION 'Relation with product % does not exist', p_product_id;
      END IF;

      DELETE FROM product_category_rel WHERE product_id = p_product_id AND category_id = p_category_id;

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_categories_json(p_product_id) INTO v_categories_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'categories', COALESCE(v_categories_json, '[]'::json)
      );

      CALL sp_logger_product(p_product_id, 'category_removed', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_delete_product()
    RETURNS TRIGGER as $$
    DECLARE
      v_product_id INTEGER;
      v_enterprise_id INTEGER;
      v_product_json json;
      v_categories_json json;
      v_images_json json;
      v_car_models_json json;
      v_brands_json json;
      v_enterprise_json json;
      v_metadata json;
    BEGIN
      v_product_id := OLD.id;

      SELECT enterprise_id into v_enterprise_id FROM products WHERE id = v_product_id;

      SELECT get_product_json(v_product_id) INTO v_product_json;
      SELECT get_product_categories_json(v_product_id) INTO v_categories_json;
      SELECT get_product_images_json(v_product_id) INTO v_images_json;
      SELECT get_product_cars_json(v_product_id) INTO v_car_models_json;
      SELECT get_product_brands_json(v_product_id) INTO v_brands_json;
      SELECT get_enterprise_account_json(v_enterprise_id) INTO v_enterprise_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'categories', COALESCE(v_categories_json, '[]'::json),
        'images', COALESCE(v_images_json, '[]'::json),
        'car_models', COALESCE(v_car_models_json, '[]'::json),
        'brands', COALESCE(v_brands_json, '[]'::json),
        'enterprise', v_enterprise_json
      );

      CALL sp_logger_product(v_product_id, 'deleted', v_metadata);

      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_delete_product ON products;
    CREATE TRIGGER trg_delete_product
    BEFORE DELETE ON enterprise_accounts
    FOR EACH ROW
    EXECUTE FUNCTION fn_delete_product();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_delete_product ON enterprise_accounts;
    DROP TRIGGER IF EXISTS trg_delete_product ON products;
    DROP FUNCTION IF EXISTS fn_delete_product() CASCADE;
    DROP PROCEDURE IF EXISTS remove_category(integer, integer);
    DROP PROCEDURE IF EXISTS add_category(integer, integer);
    DROP PROCEDURE IF EXISTS remove_car(integer, integer);
    DROP PROCEDURE IF EXISTS add_car(integer, integer);
    DROP PROCEDURE IF EXISTS remove_image(integer, integer);
    DROP PROCEDURE IF EXISTS add_image(integer, integer);
    DROP PROCEDURE IF EXISTS add_new_image(integer, text);
    DROP FUNCTION IF EXISTS update_product(integer, text, integer, integer, numeric);
    DROP FUNCTION IF EXISTS create_product(text, integer, integer, numeric, integer[], integer[], json);
    DROP PROCEDURE IF EXISTS sp_logger_product(integer, text, json);
    DROP FUNCTION IF EXISTS get_product_cars_json(integer);
    DROP FUNCTION IF EXISTS get_product_brands_json(integer);
    DROP FUNCTION IF EXISTS get_product_images_json(integer);
    DROP FUNCTION IF EXISTS get_product_categories_json(integer);
    DROP FUNCTION IF EXISTS get_product_json(integer);
  `);
}
