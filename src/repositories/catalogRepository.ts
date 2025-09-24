import e from "express";
import db from "./db";

export const getAllProducts = async () => {
  try {
    const raw = await db.raw(`SELECT fn_get_all_products();`);
    const products = raw.rows[0].fn_get_all_products;
    return products;
  } catch (error) {
    throw error;
  }
};

export const getProductByID = async (productId : string) => {
  try {
    const raw = await db.raw(`SELECT fn_get_product(?)`, [productId]);
    const products = raw.rows[0].fn_get_product;
    return products;
  } catch (error) {
    throw error;
  }
};

export const getAllProductByCategoryID = async (categoryId : string) => {
  try {
    const raw = await db.raw(`SELECT fn_get_products_by_category(?)`, [categoryId]);
    const products = raw.rows[0].fn_get_products_by_category;
    return products;
  } catch (error) {
    throw error;
  }
};

export const getNProductByCategoryID = async (categoryId : string, limit : number) => {
  try {
    const raw = await db.raw(`SELECT fn_get_n_products_by_category(?, ?)`, [categoryId, limit]);
    const products = raw.rows[0].fn_get_n_products_by_category;
    return products;
  } catch (error) {
    throw error;
  }
};

export const getAllProductByStoreID = async (storeId : string) => {
  try {
    const raw = await db.raw(`SELECT fn_get_enterprise_account(?)`, [storeId]);
    const products = raw.rows[0].fn_get_enterprise_account;
    return products;
  } catch (error) {
    throw error;
  }
};