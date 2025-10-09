import * as DetailsRepository from '../repositories/productDetailsRepository';

export const create_car_model = async (name: string) => {
  return await DetailsRepository.addCarModel(name);
};

export const create_brand = async (name: string) => {
  return await DetailsRepository.addBrand(name);
}

export const fetch_car_models = async () => {
  return await DetailsRepository.getCarModels();
};

export const fetch_brands = async () => {
  return await DetailsRepository.getBrands();
};

export const remove_car_model = async (id: number) => {
  return await DetailsRepository.deleteCarModel(id);
};

export const remove_brand = async (id: number) => {
  return await DetailsRepository.deleteBrand(id);
};