import db from './db';

const TABLE_ACCOUNT_SAVES = 'account_saves';

export const save_product = async (productId: number, userId: number) => {
  try {
    const result = await db(TABLE_ACCOUNT_SAVES).insert({ product_id: productId, user_id: userId });
    return result;
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
};

export const unsave_product = async (productId: number, userId: number) => {
  try {
    await db(TABLE_ACCOUNT_SAVES).delete().where({ product_id: productId, user_id: userId });
  } catch (error) {
    console.error('Error unsaving product:', error);
    throw error;
  }
};

export const get_saved_products = async (userId: number) => {
  try {
    const savedProducts = await db(TABLE_ACCOUNT_SAVES).select().where({ user_id: userId });
    return savedProducts;
  } catch (error) {
    console.error('Error fetching saved products:', error);
    throw error;
  }
};
