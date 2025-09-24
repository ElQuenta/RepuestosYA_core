import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {

  await knex.raw(`
  CREATE OR REPLACE FUNCTION fn_get_all_products()
  RETURNS json
  LANGUAGE sql
  AS $$
    SELECT COALESCE(json_agg(prod), '[]'::json) FROM (
      SELECT
        p.id,
        p.name,
        p.stock,
        p.enterprise_id,
        (SELECT COALESCE(a.username, ea.representant) FROM enterprise_accounts ea LEFT JOIN accounts a ON a.id = ea.account_id WHERE ea.id = p.enterprise_id LIMIT 1) AS enterprise_name,
        (SELECT ea.nit FROM enterprise_accounts ea WHERE ea.id = p.enterprise_id LIMIT 1) AS enterprise_nit,
        (SELECT COUNT(*) FROM account_saves s WHERE s.product_id = p.id) AS saves_count,
        (SELECT json_build_object('id', i.id, 'url', i.url)
         FROM images i
         JOIN product_images pi ON pi.image_id = i.id
         WHERE pi.product_id = p.id
         ORDER BY i.id
         LIMIT 1
        ) AS image,
        (SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
         FROM product_categories pc
         JOIN product_category_rel pcr ON pcr.category_id = pc.id
         WHERE pcr.product_id = p.id
        ) AS categories,
        (SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
         FROM car_models cm
         JOIN product_car_models pcm ON pcm.car_model_id = cm.id
         WHERE pcm.product_id = p.id
        ) AS car_models,
        p.created_at,
        p.updated_at
      FROM products p
      ORDER BY p.id
    ) AS prod;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE FUNCTION fn_get_products_by_category(p_category_id integer)
  RETURNS json
  LANGUAGE sql
  AS $$
    SELECT COALESCE(json_agg(prod), '[]'::json) FROM (
      SELECT
        p.id,
        p.name,
        p.stock,
        p.enterprise_id,
        (SELECT COALESCE(a.username, ea.representant) FROM enterprise_accounts ea LEFT JOIN accounts a ON a.id = ea.account_id WHERE ea.id = p.enterprise_id LIMIT 1) AS enterprise_name,
        (SELECT ea.nit FROM enterprise_accounts ea WHERE ea.id = p.enterprise_id LIMIT 1) AS enterprise_nit,
        (SELECT COUNT(*) FROM account_saves s WHERE s.product_id = p.id) AS saves_count,
        (SELECT json_build_object('id', i.id, 'url', i.url)
         FROM images i
         JOIN product_images pi ON pi.image_id = i.id
         WHERE pi.product_id = p.id
         ORDER BY i.id
         LIMIT 1
        ) AS image,
        (SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
         FROM product_categories pc
         JOIN product_category_rel pcr ON pcr.category_id = pc.id
         WHERE pcr.product_id = p.id
        ) AS categories,
        (SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
         FROM car_models cm
         JOIN product_car_models pcm ON pcm.car_model_id = cm.id
         WHERE pcm.product_id = p.id
        ) AS car_models,
        p.created_at,
        p.updated_at
      FROM products p
      JOIN product_category_rel pcr ON pcr.product_id = p.id
      WHERE pcr.category_id = p_category_id
      GROUP BY p.id, p.name, p.stock, p.enterprise_id, p.created_at, p.updated_at
      ORDER BY p.id
    ) AS prod;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE FUNCTION fn_get_n_products_by_category(p_category_id integer, p_limit integer)
  RETURNS json
  LANGUAGE sql
  AS $$
    SELECT COALESCE(json_agg(prod), '[]'::json) FROM (
      SELECT
        p.id,
        p.name,
        p.stock,
        p.enterprise_id,
        (SELECT COALESCE(a.username, ea.representant) FROM enterprise_accounts ea LEFT JOIN accounts a ON a.id = ea.account_id WHERE ea.id = p.enterprise_id LIMIT 1) AS enterprise_name,
        (SELECT ea.nit FROM enterprise_accounts ea WHERE ea.id = p.enterprise_id LIMIT 1) AS enterprise_nit,
        (SELECT COUNT(*) FROM account_saves s WHERE s.product_id = p.id) AS saves_count,
        (SELECT json_build_object('id', i.id, 'url', i.url)
         FROM images i
         JOIN product_images pi ON pi.image_id = i.id
         WHERE pi.product_id = p.id
         ORDER BY i.id
         LIMIT 1
        ) AS image,
        (SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
         FROM product_categories pc
         JOIN product_category_rel pcr ON pcr.category_id = pc.id
         WHERE pcr.product_id = p.id
        ) AS categories,
        (SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
         FROM car_models cm
         JOIN product_car_models pcm ON pcm.car_model_id = cm.id
         WHERE pcm.product_id = p.id
        ) AS car_models,
        p.created_at,
        p.updated_at
      FROM products p
      JOIN product_category_rel pcr ON pcr.product_id = p.id
      WHERE pcr.category_id = p_category_id
      GROUP BY p.id, p.name, p.stock, p.enterprise_id, p.created_at, p.updated_at
      ORDER BY p.id
      LIMIT p_limit
    ) AS prod;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE FUNCTION fn_get_enterprise_account(p_enterprise_id integer)
  RETURNS json
  LANGUAGE sql
  AS $$
    SELECT json_build_object(
      'id', ea.id,
      'nit', ea.nit,
      'address', ea.address,
      'description', ea.description,
      'representant', ea.representant,
      'representant_ci', ea.representant_ci,
      'account_id', ea.account_id,
      'name', COALESCE(a.username, ea.representant),
      'links', COALESCE((SELECT json_agg(json_build_object('id', el.id, 'name', el.name, 'link', el.link)) FROM external_links el WHERE el.enterprise_id = ea.id), '[]'::json),
      'products', COALESCE((
        SELECT json_agg(prod) FROM (
          SELECT
            p.id,
            p.name,
            p.stock,
            p.enterprise_id,
            (SELECT COUNT(*) FROM account_saves s WHERE s.product_id = p.id) AS saves_count,
            (SELECT json_build_object('id', i.id, 'url', i.url)
             FROM images i
             JOIN product_images pi ON pi.image_id = i.id
             WHERE pi.product_id = p.id
             ORDER BY i.id
             LIMIT 1
            ) AS image,
            (SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
             FROM product_categories pc
             JOIN product_category_rel pcr ON pcr.category_id = pc.id
             WHERE pcr.product_id = p.id
            ) AS categories,
            (SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
             FROM car_models cm
             JOIN product_car_models pcm ON pcm.car_model_id = cm.id
             WHERE pcm.product_id = p.id
            ) AS car_models,
            p.created_at,
            p.updated_at
          FROM products p
          WHERE p.enterprise_id = ea.id
          ORDER BY p.id
        ) AS prod
      ), '[]'::json)
    )
    FROM enterprise_accounts ea
    LEFT JOIN accounts a ON a.id = ea.account_id
    WHERE ea.id = p_enterprise_id
    LIMIT 1;
  $$;
  `);

  await knex.raw(`
  CREATE OR REPLACE FUNCTION fn_get_product(p_product_id integer)
  RETURNS json
  LANGUAGE sql
  AS $$
    SELECT COALESCE(json_agg(prod), '[]'::json)->0 FROM (
      SELECT
        p.id,
        p.name,
        p.stock,
        p.enterprise_id,
        (SELECT COALESCE(a.username, ea.representant) FROM enterprise_accounts ea LEFT JOIN accounts a ON a.id = ea.account_id WHERE ea.id = p.enterprise_id LIMIT 1) AS enterprise_name,
        (SELECT ea.nit FROM enterprise_accounts ea WHERE ea.id = p.enterprise_id LIMIT 1) AS enterprise_nit,
        (SELECT COUNT(*) FROM account_saves s WHERE s.product_id = p.id) AS saves_count,
        (SELECT json_build_object('id', i.id, 'url', i.url)
         FROM images i
         JOIN product_images pi ON pi.image_id = i.id
         WHERE pi.product_id = p.id
         ORDER BY i.id
         LIMIT 1
        ) AS image,
        (SELECT COALESCE(json_agg(json_build_object('id', pc.id, 'name', pc.name)), '[]'::json)
         FROM product_categories pc
         JOIN product_category_rel pcr ON pcr.category_id = pc.id
         WHERE pcr.product_id = p.id
        ) AS categories,
        (SELECT COALESCE(json_agg(json_build_object('id', cm.id, 'name', cm.name)), '[]'::json)
         FROM car_models cm
         JOIN product_car_models pcm ON pcm.car_model_id = cm.id
         WHERE pcm.product_id = p.id
        ) AS car_models,
        p.created_at,
        p.updated_at
      FROM products p
      WHERE p.id = p_product_id
      LIMIT 1
    ) AS prod;
  $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP FUNCTION IF EXISTS fn_get_product(integer);
    DROP FUNCTION IF EXISTS fn_get_enterprise_account(integer);
    DROP FUNCTION IF EXISTS fn_get_n_products_by_category(integer, integer);
    DROP FUNCTION IF EXISTS fn_get_products_by_category(integer);
    DROP FUNCTION IF EXISTS fn_get_all_products();
  `);
}
