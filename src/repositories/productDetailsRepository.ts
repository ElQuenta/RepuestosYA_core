import db from './db';

const TABLE_CAR_MODELS = "car_models";
const TABLE_BRANDS = "brands";

export const addCarModel = async (name: string) => {
  try {
    const result = await db(TABLE_CAR_MODELS).insert({ name });
    return result;
  } catch (error) {
    console.error('Error adding car model:', error);
    throw error;
  }
};

export const addBrand = async (name: string) => {
  try {
    const result = await db(TABLE_BRANDS).insert({ name });
    return result;
  } catch (error) {
    console.error('Error adding brand:', error);
    throw error;
  }
};

export const getCarModels = async () => {
  try {
    const carModels = await db(TABLE_CAR_MODELS).select("*");
    return carModels;
  } catch (error) {
    console.error('Error getting car models:', error);
    throw error;
  }
};

export const getBrands = async () => {
  try {
    const brands = await db(TABLE_BRANDS).select("*");
    return brands;
  } catch (error) {
    console.error('Error getting brands:', error);
    throw error;
  }
};

export const deleteCarModel = async (id: number) => {
  try {
    const result = await db(TABLE_CAR_MODELS).where({ id }).del();
    return result;
  } catch (error) {
    console.error('Error deleting car model:', error);
    throw error;
  }
};

export const deleteBrand = async (id: number) => {
  try {
    const result = await db(TABLE_BRANDS).where({ id }).del();
    return result;
  } catch (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
};
