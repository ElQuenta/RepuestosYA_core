import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- Función get_product_json: esta función sirve para obtener la representación JSON
    -- básica de un producto (id, name, stock, price).
    CREATE OR REPLACE FUNCTION get_product_json(prodId int)
    RETURNS json AS $$
    BEGIN
      -- Se valida mediante el WHERE que solo se construya el JSON para el producto solicitado;
      -- si no existe, la función retornará NULL.
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
    -- Función get_product_categories_json: devuelve las categorías asociadas a un producto
    -- como un array JSON (retorna '[]' si no hay categorías).
    CREATE OR REPLACE FUNCTION get_product_categories_json(prodId int)
    RETURNS json as $$
      DECLARE
        v_categories_json json;
      BEGIN
        -- Se valida/normaliza el resultado con COALESCE para evitar devolver NULL cuando no haya categorías.
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
    -- Función get_product_images_json: devuelve las imágenes asociadas a un producto
    -- como un array JSON (retorna '[]' si no hay imágenes).
    CREATE OR REPLACE FUNCTION get_product_images_json(prodId int)
    RETURNS json as $$
      DECLARE
        v_images_json json;
      BEGIN
        -- Se valida/normaliza el resultado para evitar NULLs.
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
    -- Función get_product_brands_json: devuelve las marcas asociadas a un producto
    -- como un array JSON (retorna '[]' si no hay marcas).
    CREATE OR REPLACE FUNCTION get_product_brands_json(prodId int)
    RETURNS json as $$
      DECLARE
        v_brands_json json;
      BEGIN
        -- Se valida/normaliza el resultado para evitar NULLs.
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
    -- Función get_product_cars_json: devuelve los modelos de auto asociados a un producto
    -- como un array JSON (retorna '[]' si no hay modelos).
    CREATE OR REPLACE FUNCTION get_product_cars_json(prodId int)
    RETURNS json as $$
      DECLARE
        v_cars_json json;
      BEGIN
        -- Se valida/normaliza el resultado para evitar NULLs.
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
    -- Procedimiento sp_logger_product: centraliza el guardado de logs relacionados a productos
    -- en la tabla product_log.
    CREATE OR REPLACE PROCEDURE sp_logger_product(
      p_product_id IN INT,
      p_action IN TEXT,
      p_metadata IN json
    )
    LANGUAGE plpgsql AS $$
      BEGIN
        -- En esta parte del Procedimiento se genera el registro/payload/log insertándolo en product_log.
        INSERT INTO product_log (product_id, action, metadata)
        VALUES (p_product_id, p_action, p_metadata);
      END;
    $$;
  `);

  await knex.raw(`
    -- Función create_product: crea un producto, asocia categorías, marcas, modelos de auto e imágenes opcionales,
    -- construye el payload con todos los detalles y registra la creación.
    CREATE OR REPLACE FUNCTION create_product (
      p_name text,
      p_enterprise_id integer,
      p_stock integer DEFAULT 0,
      p_price numeric DEFAULT 0,
      p_category_ids integer[] DEFAULT ARRAY[]::integer[],
      p_car_model_ids integer[] DEFAULT ARRAY[]::integer[],
      p_brand_ids integer[] DEFAULT ARRAY[]::integer[],
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
      v_brand_id integer;
      v_img json;
      v_img_id integer;
      v_img_url text;
    BEGIN
      -- Se valida que la cuenta empresarial exista para evitar crear productos huérfanos.
      IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
        RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
      END IF;

      -- Inserta el producto y captura su id.
      INSERT INTO products (name, stock, price, enterprise_id)
        VALUES (p_name, p_stock, p_price, p_enterprise_id)
      RETURNING id INTO v_product_id;

      -- Se valida que p_category_ids no sea NULL y tenga elementos antes de iterar.
      IF array_length(p_category_ids,1) IS NOT NULL THEN
        FOREACH v_cat_id IN ARRAY p_category_ids LOOP
          -- Se valida existencia de la categoría para evitar relaciones inválidas.
          IF NOT EXISTS (SELECT 1 FROM product_categories WHERE id = v_cat_id) THEN
            RAISE EXCEPTION 'Product category % does not exist', v_cat_id;
          END IF;

          INSERT INTO product_category_rel (product_id, category_id)
          VALUES (v_product_id, v_cat_id)
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;

      -- Se valida que p_car_model_ids no sea NULL y tenga elementos antes de iterar.
      IF array_length(p_car_model_ids,1) IS NOT NULL THEN
        FOREACH v_car_id IN ARRAY p_car_model_ids LOOP
          -- Se valida existencia del modelo de auto.
          IF NOT EXISTS (SELECT 1 FROM car_models WHERE id = v_car_id) THEN
            RAISE EXCEPTION 'Car model % does not exist', v_car_id;
          END IF;

          INSERT INTO product_car_models (product_id, car_model_id)
          VALUES (v_product_id, v_car_id)
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;

      -- Se valida que p_brand_ids no sea NULL y tenga elementos antes de iterar.
      IF array_length(p_brand_ids,1) IS NOT NULL THEN
        FOREACH v_brand_id IN ARRAY p_brand_ids LOOP
          -- Se valida existencia de la marca.
          IF NOT EXISTS (SELECT 1 FROM brands WHERE id = v_brand_id) THEN
            RAISE EXCEPTION 'Brand % does not exist', v_brand_id;
          END IF;

          INSERT INTO product_brands (product_id, brand_id)
          VALUES (v_product_id, v_brand_id)
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;

      -- Manejo de imágenes: se valida que p_images sea un array JSON no vacío antes de procesar.
      IF p_images IS NOT NULL AND json_array_length(p_images) > 0 THEN
        FOR v_img IN SELECT * FROM json_array_elements(p_images) LOOP
          v_img_url := (v_img ->> 'url');
          BEGIN
            v_img_id := NULL;
            -- Si el objeto viene con 'id', se valida que exista la imagen.
            IF (v_img ->> 'id') IS NOT NULL AND (v_img ->> 'id') <> '' THEN
              v_img_id := (v_img ->> 'id')::integer;
              IF NOT EXISTS (SELECT 1 FROM images WHERE id = v_img_id) THEN
                RAISE EXCEPTION 'Image id % does not exist', v_img_id;
              END IF;
            ELSE
              -- Si no hay id, se valida que exista una URL no vacía antes de insertar.
              IF v_img_url IS NULL OR trim(v_img_url) = '' THEN
                RAISE EXCEPTION 'Image object must contain "id" or non-empty "url"';
              END IF;
              INSERT INTO images (url)
                VALUES (v_img_url)
              RETURNING id INTO v_img_id;
            END IF;

            INSERT INTO product_images (product_id, image_id)
            VALUES (v_product_id, v_img_id)
            ON CONFLICT DO NOTHING;

          EXCEPTION WHEN others THEN
            -- Re-lanzar la excepción para que quede trazable en la transacción.
            RAISE;
          END;
        END LOOP;
      END IF;

      -- Recupera todos los snapshots/representaciones para construir el payload.
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

      -- En esta parte de la Función se genera el registro/payload/log con la acción 'created'.
      CALL sp_logger_product(v_product_id, 'created', v_metadata);

      RETURN v_metadata;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Función update_product: actualiza campos selectivos de un producto (uso de COALESCE)
    -- y registra la actualización.
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
      -- Se valida que el producto exista antes de actualizar.
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
      END IF;
      -- Si se proporciona enterprise_id, se valida que exista.
      IF p_enterprise_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
          RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
        END IF;
      END IF;

      -- Actualiza campos usando COALESCE para evitar sobrescribir con NULL.
      UPDATE products
      SET
        name = coalesce(p_name, name),
        price = coalesce(p_price, price),
        stock = coalesce(p_stock, stock),
        enterprise_id = coalesce(p_enterprise_id, enterprise_id)
      WHERE id = p_product_id;

      -- Recupera snapshot del producto y la empresa asociada (si se cambió, usa el nuevo id).
      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_enterprise_account_json(coalesce(p_enterprise_id,(select enterprise_id from products where id = p_product_id))) INTO v_enterprise_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'enterprise', v_enterprise_json
      );

      -- En esta parte de la Función se genera el registro/payload/log con la acción 'update'.
      CALL sp_logger_product(p_product_id,'update',v_metadata);

      return v_metadata;

    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Procedimiento add_new_image: inserta una nueva imagen y la asocia a un producto,
    -- luego registra la acción.
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
      -- Se valida que el producto exista para evitar relaciones inválidas.
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
      END IF;

      -- Inserta la imagen y asocia al producto.
      INSERT INTO images (url)
      VALUES (p_url) RETURNING id INTO v_img_id;

      INSERT INTO product_images(product_id, image_id)
      VALUES (p_product_id,v_img_id);

      -- Recupera snapshots para el payload.
      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_images_json(p_product_id) INTO v_images_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'images', COALESCE(v_images_json, '[]'::json)
      );

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'image_added'.
      CALL sp_logger_product(p_product_id, 'image_added', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    -- Procedimiento remove_image: elimina la relación entre producto e imagen y registra la acción.
    CREATE OR REPLACE PROCEDURE remove_image(
        p_product_id IN INTEGER,
        p_image_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_images_json json;
      v_metadata json;
    BEGIN
      -- Se valida que exista la relación producto-imagen antes de eliminar.
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

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'image_removed'.
      CALL sp_logger_product(p_product_id, 'image_removed', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    -- Procedimiento add_car: asocia un modelo de auto a un producto y registra la acción.
    CREATE OR REPLACE PROCEDURE add_car(
      p_product_id IN INTEGER,
      p_car_model_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_car_models_json json;
      v_metadata json;
    BEGIN
      -- Validaciones para evitar relaciones inválidas.
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM car_models WHERE id = p_car_model_id) THEN
        RAISE EXCEPTION 'Car model % does not exist', p_car_model_id;
      END IF;

      INSERT INTO product_car_models (product_id, car_model_id)
      VALUES (p_product_id, p_car_model_id)
      ON CONFLICT DO NOTHING;

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_cars_json(p_product_id) INTO v_car_models_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'car_models', COALESCE(v_car_models_json, '[]'::json)
      );

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'car_model_added'.
      CALL sp_logger_product(p_product_id, 'car_model_added', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    -- Procedimiento remove_car: elimina la relación entre producto y modelo de auto y registra la acción.
    CREATE OR REPLACE PROCEDURE remove_car(
      p_product_id IN INTEGER,
      p_car_model_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_car_models_json json;
      v_metadata json;
    BEGIN
      -- Se valida que la relación exista antes de eliminar.
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

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'car_model_removed'.
      CALL sp_logger_product(p_product_id, 'car_model_removed', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    -- Procedimiento add_category: asocia una categoría a un producto y registra la acción.
    CREATE OR REPLACE PROCEDURE add_category(
      p_product_id IN INTEGER,
      p_category_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_categories_json json;
      v_metadata json;
    BEGIN
      -- Validaciones para la existencia del producto y la categoría.
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM product_categories WHERE id = p_category_id) THEN
        RAISE EXCEPTION 'Product category % does not exist', p_category_id;
      END IF;

      INSERT INTO product_category_rel (product_id, category_id)
      VALUES (p_product_id, p_category_id)
      ON CONFLICT DO NOTHING;

      SELECT get_product_json(p_product_id) INTO v_product_json;
      SELECT get_product_categories_json(p_product_id) INTO v_categories_json;

      v_metadata := json_build_object(
        'product', v_product_json,
        'categories', COALESCE(v_categories_json, '[]'::json)
      );

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'category_added'.
      CALL sp_logger_product(p_product_id, 'category_added', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    -- Procedimiento remove_category: elimina la relación categoría-producto y registra la acción.
    CREATE OR REPLACE PROCEDURE remove_category(
      p_product_id IN INTEGER,
      p_category_id IN INTEGER
    ) LANGUAGE plpgsql AS $$
    DECLARE
      v_product_json json;
      v_categories_json json;
      v_metadata json;
    BEGIN
      -- Se valida que la relación exista antes de eliminar.
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

      -- En esta parte del Procedimiento se genera el registro/payload/log con la acción 'category_removed'.
      CALL sp_logger_product(p_product_id, 'category_removed', v_metadata);

    END;
    $$;
  `);

  await knex.raw(`
    -- Función trigger fn_delete_product: genera un snapshot y log antes de que un producto sea eliminado.
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

      -- Se recupera enterprise_id desde la tabla products (podría ser NULL; se asume que la relación existe).
      SELECT enterprise_id into v_enterprise_id FROM products WHERE id = v_product_id;

      -- Recupera todos los snapshots/representaciones antes de la eliminación.
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

      -- En esta parte del Trigger se genera el registro/payload/log con la acción 'deleted'.
      CALL sp_logger_product(v_product_id, 'deleted', v_metadata);

      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Trigger trg_delete_product: se ejecuta BEFORE DELETE ON products para delegar la creación del log
    -- en fn_delete_product (snapshot previo a la eliminación).
    DROP TRIGGER IF EXISTS trg_delete_product ON products;
    CREATE TRIGGER trg_delete_product
    BEFORE DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION fn_delete_product();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
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
