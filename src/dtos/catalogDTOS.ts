import { User, Enterprise, ExternalLink } from './authDTOs';
import { BrandDTO, CarModelDTO, ProductBasicDTO, ProductCategoryDTO, ProductImageDTO } from './productDTOs';

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
