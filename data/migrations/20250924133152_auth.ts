import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_user_full_by_email(p_email TEXT)
    RETURNS JSONB
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        jsonb_build_object(
          'account', to_jsonb(a),
          'roles', COALESCE(
            (SELECT jsonb_agg(to_jsonb(r) - 'created_at' - 'updated_at')
             FROM roles r
             JOIN account_roles ar ON r.id = ar.role_id
             WHERE ar.account_id = a.id),
            '[]'::jsonb
          ),
          'enterprise_account',
            (SELECT jsonb_build_object(
               'enterprise', to_jsonb(ea) - 'account_id',
               'external_links', COALESCE(
                 (SELECT jsonb_agg(to_jsonb(el) - 'created_at' - 'updated_at')
                  FROM external_links el
                  WHERE el.enterprise_id = ea.id),
                 '[]'::jsonb
               )
             )
             FROM enterprise_accounts ea
             WHERE ea.account_id = a.id
            )
        )
      FROM accounts a
      WHERE a.email = p_email
      LIMIT 1;
    $$;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION create_enterprise_with_account(
        p_username text,
        p_email text,
        p_password text,
        p_cellphone_num text,
        p_NIT text,
        p_address text,
        p_representant text,
        p_representant_CI text,
        p_roles integer[] DEFAULT ARRAY[]::integer[],
        p_description text DEFAULT NULL,
        p_links json DEFAULT '[]'::json
    )
    RETURNS json
    LANGUAGE plpgsql
    AS $$
    DECLARE
        v_account_id integer;
    BEGIN
        v_account_id := create_account_with_roles(
            p_username,
            p_email,
            p_password,
            p_cellphone_num,
            p_roles
        );

        CALL create_enterprise_with_links(
            p_NIT,
            p_address,
            p_representant,
            p_representant_CI,
            v_account_id,
            p_description,
            p_links
        );

        RETURN json_build_object(
            'account_id', v_account_id,
            'username', p_username,
            'email', p_email,
            'enterprise_NIT', p_NIT,
            'representant', p_representant
        );
    END;
    $$;
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP FUNCTION IF EXISTS get_user_full_by_email(TEXT);`);
  await knex.raw(`DROP FUNCTION IF EXISTS create_enterprise_with_account(TEXT, TEXT, TEXT, TEXT, INTEGER[], TEXT, TEXT, TEXT, TEXT, TEXT, JSON DEFAULT '[]'::json);`);
}
