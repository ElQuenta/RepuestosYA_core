import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- Función catalog_all: devuelve el catálogo completo de productos que cumplen
    -- los criterios mínimos (empresa asociada, 1 imagen, categorías, modelos de auto y marcas).
    CREATE OR REPLACE FUNCTION catalog_all()
    RETURNS json AS $$
    DECLARE
      v_result json;
    BEGIN
      -- Se construye un array JSON con snapshots por producto usando funciones auxiliares.
      -- Se valida en el WHERE la existencia de la enterprise y de las relaciones necesarias
      -- para evitar incluir productos incompletos.
      SELECT COALESCE(json_agg(json_build_object(
        'product', get_product_json(p.id),
        'categories', COALESCE(get_product_categories_json(p.id), '[]'::json),
        -- Se usa -> 0 para tomar la primera imagen (snapshot simple).
        'image', (get_product_images_json(p.id) -> 0),
        'car_models', COALESCE(get_product_cars_json(p.id), '[]'::json),
        'brands', COALESCE(get_product_brands_json(p.id), '[]'::json),
        'enterprise', get_enterprise_account_json(p.enterprise_id)
      )), '[]'::json)
      INTO v_result
      FROM products p
      WHERE
        -- Se valida que el producto tenga enterprise_id y que la enterprise exista.
        p.enterprise_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM enterprise_accounts e WHERE e.id = p.enterprise_id)
        -- Se valida que tenga exactamente 1 imagen (criterio de negocio).
        AND (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) = 1
        -- Se valida que existan relaciones obligatorias (categoría, car_model, brand).
        AND EXISTS (SELECT 1 FROM product_category_rel cr WHERE cr.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_car_models pcm WHERE pcm.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id);

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Función catalog_by_id: devuelve el catálogo filtrado por producto (id).
    -- Útil para obtener un único producto que cumpla los criterios.
    CREATE OR REPLACE FUNCTION catalog_by_id(
      p_product_id INTEGER
    )
    RETURNS json AS $$
    DECLARE
      v_result json;
    BEGIN
      -- Se arma un JSON similar a catalog_all pero filtrando por p_product_id.
      SELECT COALESCE(json_agg(json_build_object(
        'product', get_product_json(p.id),
        'categories', COALESCE(get_product_categories_json(p.id), '[]'::json),
        -- Aquí devolvemos la lista completa de imágenes (podría contener 1 elemento).
        'image', COALESCE(get_product_images_json(p.id), '[]'::json),
        'car_models', COALESCE(get_product_cars_json(p.id), '[]'::json),
        'brands', COALESCE(get_product_brands_json(p.id), '[]'::json),
        'enterprise', get_enterprise_account_json(p.enterprise_id)
      )), '[]'::json)
      INTO v_result
      FROM products p
      WHERE
        p.enterprise_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM enterprise_accounts e WHERE e.id = p.enterprise_id)
        AND (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) = 1
        AND EXISTS (SELECT 1 FROM product_category_rel cr WHERE cr.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_car_models pcm WHERE pcm.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id)
        AND p.id = p_product_id
      LIMIT 1;

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Función catalog_by_category: devuelve productos filtrados por categoría.
    -- Agrupa productos que pertenezcan a p_category_id y cumplan criterios mínimos.
    CREATE OR REPLACE FUNCTION catalog_by_category(
      p_category_id INTEGER
    )
    RETURNS json AS $$
    DECLARE
      v_result json;
    BEGIN
      -- JOIN con product_category_rel para filtrar por categoría.
      SELECT COALESCE(json_agg(json_build_object(
        'product', get_product_json(p.id),
        'categories', COALESCE(get_product_categories_json(p.id), '[]'::json),
        'image', (get_product_images_json(p.id) -> 0),
        'car_models', COALESCE(get_product_cars_json(p.id), '[]'::json),
        'brands', COALESCE(get_product_brands_json(p.id), '[]'::json),
        'enterprise', get_enterprise_account_json(p.enterprise_id)
      )), '[]'::json)
      INTO v_result
      FROM products p
      JOIN public.product_category_rel pcr ON p.id = pcr.product_id
      WHERE
        p.enterprise_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM enterprise_accounts e WHERE e.id = p.enterprise_id)
        AND (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) = 1
        AND EXISTS (SELECT 1 FROM product_category_rel cr WHERE cr.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_car_models pcm WHERE pcm.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id)
        -- Se valida que el producto esté asociado a la categoría solicitada.
        AND pcr.category_id = p_category_id;

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Función catalog_n_by_category: devuelve hasta p_limit productos de una categoría.
    -- Idéntica a catalog_by_category pero con límite paramétrico.
    CREATE OR REPLACE FUNCTION catalog_n_by_category(
      p_category_id INTEGER,
      p_limit INTEGER
    )
    RETURNS json AS $$
    DECLARE
      v_result json;
    BEGIN
      SELECT COALESCE(json_agg(json_build_object(
        'product', get_product_json(p.id),
        'categories', COALESCE(get_product_categories_json(p.id), '[]'::json),
        'image', (get_product_images_json(p.id) -> 0),
        'car_models', COALESCE(get_product_cars_json(p.id), '[]'::json),
        'brands', COALESCE(get_product_brands_json(p.id), '[]'::json),
        'enterprise', get_enterprise_account_json(p.enterprise_id)
      )), '[]'::json)
      INTO v_result
      FROM products p
      JOIN public.product_category_rel pcr ON p.id = pcr.product_id
      WHERE
        p.enterprise_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM enterprise_accounts e WHERE e.id = p.enterprise_id)
        AND (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) = 1
        AND EXISTS (SELECT 1 FROM product_category_rel cr WHERE cr.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_car_models pcm WHERE pcm.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id)
        AND pcr.category_id = p_category_id
      -- Se aplica el límite dinámico pasado en p_limit (puede ser NULL => equivale a sin límite).
      LIMIT p_limit;

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    -- Función catalog_by_enterprise: devuelve la información de una enterprise (account, enterprise, links)
    -- y los productos relacionados que cumplan criterios mínimos.
    CREATE OR REPLACE FUNCTION catalog_by_enterprise(p_enterprise_id integer)
    RETURNS json AS $$
    DECLARE
      v_account json;
      v_enterprise json;
      v_external_links json;
      v_products json;
      v_account_id integer;
    BEGIN
      -- Se valida que la enterprise exista para evitar consultas inválidas.
      IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
        RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
      END IF;

      -- Recupera snapshot de la enterprise.
      SELECT get_enterprise_account_json(p_enterprise_id) INTO v_enterprise;

      -- Recupera el account_id asociado (si existe) y, si lo hay, toma su snapshot.
      SELECT account_id INTO v_account_id FROM enterprise_accounts WHERE id = p_enterprise_id;
      IF v_account_id IS NOT NULL THEN
        SELECT get_account_json(v_account_id) INTO v_account;
      ELSE
        -- Se valida/normaliza: si no hay account asociado, se deja NULL.
        v_account := NULL;
      END IF;

      -- Recupera links externos (normalizado a '[]' si no hay).
      SELECT COALESCE(get_enterprise_account_external_links_json(p_enterprise_id), '[]'::json) INTO v_external_links;

      -- Recupera productos de la enterprise que cumplen los criterios mínimos.
      SELECT COALESCE(json_agg(json_build_object(
        'product', get_product_json(p.id),
        'categories', COALESCE(get_product_categories_json(p.id), '[]'::json),
        'image', (get_product_images_json(p.id) -> 0),
        'car_models', COALESCE(get_product_cars_json(p.id), '[]'::json),
        'brands', COALESCE(get_product_brands_json(p.id), '[]'::json)
      )), '[]'::json)
      INTO v_products
      FROM products p
      WHERE
        p.enterprise_id = p_enterprise_id
        AND (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) = 1
        AND EXISTS (SELECT 1 FROM product_category_rel cr WHERE cr.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_car_models pcm WHERE pcm.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id);

      -- Construye el objeto final que agrupa account, enterprise, links y productos.
      RETURN json_build_object(
        'account', v_account,
        'enterprise', v_enterprise,
        'external_links', v_external_links,
        'products', v_products
      );
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP FUNCTION IF EXISTS catalog_all() CASCADE;
    DROP FUNCTION IF EXISTS catalog_by_id(integer) CASCADE;
    DROP FUNCTION IF EXISTS catalog_by_category(integer) CASCADE;
    DROP FUNCTION IF EXISTS catalog_n_by_category(integer, integer) CASCADE;
    DROP FUNCTION IF EXISTS catalog_by_enterprise(integer) CASCADE;
  `);
}
