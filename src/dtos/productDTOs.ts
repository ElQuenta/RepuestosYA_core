import { Enterprise } from "./authDTOs";

export interface ProductBasicDTO {
  id: number;
  name: string;
  stock: number;
  price: string | number;
}

export interface ProductCategoryDTO {
  category_id: number;
  name: string;
}

export interface ProductImageDTO {
  image_id: number;
  url: string;
}

export interface ProductCreateImageDTO {
  id?: number;
  url?: string;
}

export interface BrandDTO {
  brand_id: number;
  name: string;
}

export interface CarModelDTO {
  car_id: number;
  name: string;
}

export interface CreateProductDTO {
  enterprise_id: number;
  name: string;
  stock: number;
  price: string | number;
  categories: number[];
  brands: number[];
  car_models: number[];
  images: ProductCreateImageDTO[];
}

export interface CreateProductResponse {
  product: ProductBasicDTO
  categories: CreateProductDTO[];
  images: ProductImageDTO[];
  car_models: CarModelDTO[];
  brands: BrandDTO[];
  enterprise: Enterprise;
}

export interface UpdateProductDTO {
  id: number;
  name?: string;
  stock?: number;
  price?: string | number;
  enterprise_id?: number;
}

export interface UpdateProductResponse {
  product: ProductBasicDTO;
  enterprise: Enterprise;
};