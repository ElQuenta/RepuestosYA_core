import { Knex } from "knex";

const TABLE_PRODUCTS = "products";
const TABLE_ACCOUNT_SAVES = "account_saves";
const TABLE_CAR_MODELS = "car_models";
const TABLE_PRODUCT_CAR_MODELS = "product_car_models";
const TABLE_PRODUCT_CATEGORIES = "product_categories";
const TABLE_PRODUCT_CATEGORY_REL = "product_category_rel";
const TABLE_BRANDS = "brands";
const TABLE_PRODUCT_BRANDS = "product_brands";
const TABLE_IMAGES = "images";
const TABLE_PRODUCT_IMAGES = "product_images";
const TABLE_ENTERPRISE_ACCOUNTS = "enterprise_accounts";

export async function seed(knex: Knex): Promise<void> {
  // Limpieza (mantén el orden FK)
  await knex(TABLE_PRODUCT_IMAGES).del();
  await knex(TABLE_IMAGES).del();
  await knex(TABLE_PRODUCT_BRANDS).del();
  await knex(TABLE_BRANDS).del();
  await knex(TABLE_PRODUCT_CATEGORY_REL).del();
  await knex(TABLE_PRODUCT_CATEGORIES).del();
  await knex(TABLE_PRODUCT_CAR_MODELS).del();
  await knex(TABLE_CAR_MODELS).del();
  await knex(TABLE_ACCOUNT_SAVES).del();
  await knex(TABLE_PRODUCTS).del();

  await knex(TABLE_BRANDS).insert([
    { id: 1, name: "Genérica 1" },
    { id: 2, name: "Genérica 2" },
  ]);

  await knex(TABLE_CAR_MODELS).insert([
    { id: 1, name: "Toyota Corolla" },
    { id: 2, name: "Nissan Sentra" },
    { id: 3, name: "Honda Civic" },
  ]);

  await knex(TABLE_PRODUCT_CATEGORIES).insert([
    { id: 1, name: "Motor" },
    { id: 2, name: "Suspensión" },
    { id: 3, name: "Frenos" },
    { id: 4, name: "Transmisión" },
    { id: 5, name: "Carrocería" },
  ]);

  await knex(TABLE_PRODUCTS).insert([
    { id: 1, name: "Filtro de aceite", stock: 50, enterprise_id: 1},
    { id: 2, name: "Pastillas de freno", stock: 100, enterprise_id: 1},
    { id: 3, name: "Amortiguador delantero", stock: 30, enterprise_id: 1},
    { id: 4, name: "Parachoques", stock: 20, enterprise_id: 1},
    { id: 5, name: "Caja de cambios", stock: 10, enterprise_id: 1},
    { id: 6, name: "Aceite sintético 5W-30", stock: 75, enterprise_id: 1},
  ]);

  await knex(TABLE_IMAGES).insert([
    { id: 1, url: "https://picsum.photos/200?random=1" },
    { id: 2, url: "https://picsum.photos/200?random=2" },
    { id: 3, url: "https://picsum.photos/200?random=3" },
    { id: 4, url: "https://picsum.photos/200?random=4" },
    { id: 5, url: "https://picsum.photos/200?random=5" },
    { id: 6, url: "https://picsum.photos/200?random=6" },
    { id: 7, url: "https://picsum.photos/200?random=7" },
    { id: 8, url: "https://picsum.photos/200?random=8" },
  ]);

  await knex(TABLE_PRODUCT_IMAGES).insert([
    { product_id: 1, image_id: 1 },
    { product_id: 1, image_id: 2 },
    { product_id: 2, image_id: 3 },
    { product_id: 3, image_id: 4 },
    { product_id: 3, image_id: 5 },
    { product_id: 4, image_id: 6 },
    { product_id: 5, image_id: 7 },
    { product_id: 6, image_id: 8 },
  ]);

  await knex(TABLE_PRODUCT_CATEGORY_REL).insert([
    { product_id: 1, category_id: 1 },
    { product_id: 2, category_id: 3 },
    { product_id: 3, category_id: 2 },
    { product_id: 4, category_id: 5 }, 
    { product_id: 5, category_id: 4 }, 
    { product_id: 6, category_id: 1 },
  ]);

  await knex(TABLE_PRODUCT_CAR_MODELS).insert([
    { product_id: 1, car_model_id: 1 },
    { product_id: 2, car_model_id: 2 },
    { product_id: 3, car_model_id: 3 },
    { product_id: 4, car_model_id: 1 },
    { product_id: 5, car_model_id: 2 },
    { product_id: 6, car_model_id: 1 },
    { product_id: 6, car_model_id: 2 },
  ]);

  await knex(TABLE_PRODUCT_BRANDS).insert([
    { product_id: 1, branch_id: 1 },
    { product_id: 2, branch_id: 1 },
    { product_id: 3, branch_id: 2 },
    { product_id: 4, branch_id: 2 },
    { product_id: 5, branch_id: 1 },
    { product_id: 6, branch_id: 1 },
  ]);
}
