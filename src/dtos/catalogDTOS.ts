import { User, Enterprise, ExternalLink } from './authDTOS';

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

export interface BrandDTO {
  brand_id: number;
  name: string;
}

export interface CarModelDTO {
  car_id: number;
  name: string;
}

export interface ProductCatalogItemDTO {
  product: ProductBasicDTO;
  categories: ProductCategoryDTO[];
  image: ProductImageDTO | null;
  car_models: CarModelDTO[];
  brands: BrandDTO[];
  enterprise?: Enterprise | null;
}

export interface CatalogByEnterpriseResult {
  account: User | null;
  enterprise: Enterprise;
  external_links: ExternalLink[];
  products: Omit<ProductCatalogItemDTO, 'enterprise'>[];
}
