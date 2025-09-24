import { ErrorPayload, NotFoundError, ValidationError } from "./baseErrors";

export class CatalogItemNotFoundError extends NotFoundError {
  constructor(message = 'Catalog item not found', payload?: ErrorPayload) {
    super(message, payload);
  }
}

export class CatalogValidationError extends ValidationError {
  constructor(message = 'Invalid catalog data', payload?: ErrorPayload) {
    super(message, payload);
  }
}

export const Errors = {
  CatalogItemNotFoundError,
  CatalogValidationError,
};
