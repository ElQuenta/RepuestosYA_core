import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION catalog_all()
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
      WHERE
        p.enterprise_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM enterprise_accounts e WHERE e.id = p.enterprise_id)
        AND (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) = 1
        AND EXISTS (SELECT 1 FROM product_category_rel cr WHERE cr.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_car_models pcm WHERE pcm.product_id = p.id)
        AND EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id);

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION catalog_by_id(
      p_product_id INTEGER
    )
    RETURNS json AS $$
    DECLARE
      v_result json;
    BEGIN
      SELECT COALESCE(json_agg(json_build_object(
        'product', get_product_json(p.id),
        'categories', COALESCE(get_product_categories_json(p.id), '[]'::json),
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
    CREATE OR REPLACE FUNCTION catalog_by_category(
      p_category_id INTEGER
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
        AND pcr.category_id = p_category_id;

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
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
      LIMIT p_limit;

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION catalog_by_enterprise(p_enterprise_id integer)
    RETURNS json AS $$
    DECLARE
      v_account json;
      v_enterprise json;
      v_external_links json;
      v_products json;
      v_account_id integer;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM enterprise_accounts WHERE id = p_enterprise_id) THEN
        RAISE EXCEPTION 'Enterprise account % does not exist', p_enterprise_id;
      END IF;

      SELECT get_enterprise_account_json(p_enterprise_id) INTO v_enterprise;

      SELECT account_id INTO v_account_id FROM enterprise_accounts WHERE id = p_enterprise_id;
      IF v_account_id IS NOT NULL THEN
        SELECT get_account_json(v_account_id) INTO v_account;
      ELSE
        v_account := NULL;
      END IF;

      SELECT COALESCE(get_enterprise_account_external_links_json(p_enterprise_id), '[]'::json) INTO v_external_links;

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
