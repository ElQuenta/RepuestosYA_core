import { Knex } from "knex";

const TABLE_ROLES = "roles";
const TABLE_ACCOUNTS = "accounts";
const TABLE_ACCOUNT_ROLES = "account_roles";
const TABLE_ENTERPRISE_ACCOUNTS = "enterprise_accounts";
const TABLE_EXTERNAL_LINKS = "external_links";

export async function seed(knex: Knex): Promise<void> {
  await knex(TABLE_EXTERNAL_LINKS).del();
  await knex(TABLE_ENTERPRISE_ACCOUNTS).del();
  await knex(TABLE_ACCOUNT_ROLES).del();
  await knex(TABLE_ACCOUNTS).del();
  await knex(TABLE_ROLES).del();

  await knex(TABLE_ROLES).insert([
    { id: 1, name: "admin" },
    { id: 2, name: "user" },
    { id: 3, name: "enterprise" },
  ]);

  await knex(TABLE_ACCOUNTS).insert([
    { id: 1, username: "usuario1", email: "user1@mail.com", password: "pass1", cellphone_num: "70000001" }, // user simple
    { id: 2, username: "adminuser", email: "adminuser@mail.com", password: "pass2", cellphone_num: "70000002" }, // admin + user
    { id: 3, username: "adminsolo", email: "admin@mail.com", password: "pass3", cellphone_num: "70000003" }, // admin puro
    { id: 4, username: "empresa1", email: "empresa@mail.com", password: "pass4", cellphone_num: "70000004" }, // empresa
  ]);

  await knex(TABLE_ACCOUNT_ROLES).insert([
    { account_id: 1, role_id: 2 },
    { account_id: 2, role_id: 1 },
    { account_id: 2, role_id: 2 },
    { account_id: 3, role_id: 1 },
    { account_id: 4, role_id: 3 },
  ]);

  await knex(TABLE_ENTERPRISE_ACCOUNTS).insert([
    { id: 1, NIT: "123456789", address: "Av. Principal 123", description: "Venta de autopartes", representant: "Juan Perez", representant_CI: "CI12345", enabled: true, account_id: 4 },
  ]);

  await knex(TABLE_EXTERNAL_LINKS).insert([
    { id: 1, name: "Facebook", link: "https://facebook.com/empresa1", enterprise_id: 1 },
    { id: 2, name: "Instagram", link: "https://instagram.com/empresa1", enterprise_id: 1 },
    { id: 3, name: "Web", link: "https://empresa1.com", enterprise_id: 1 },
  ]);
}
