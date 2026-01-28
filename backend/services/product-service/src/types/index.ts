export type ProductStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'inactive' | 'out_of_stock';

export interface CreateProductDTO {
  categoryId: string;
  sellerId?: string; // Optional - null for house brands
  name: string;
  description?: string;
  shortDescription?: string;
  baseCostPrice: number;
  baseSellPrice: number;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  primaryImageUrl?: string;
  material?: string;
  careInstructions?: string;
  countryOfOrigin?: string;
  tags?: string[];
  grosirUnitSize?: number;
}

export interface UpdateProductDTO {
  categoryId?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  baseCostPrice?: number;
  baseSellPrice?: number;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  status?: ProductStatus;
  primaryImageUrl?: string;
  material?: string;
  careInstructions?: string;
  countryOfOrigin?: string;
  tags?: string[];
  grosirUnitSize?: number;
}

export interface CreateVariantDTO {
  productId: string;
  sku: string;
  color: string;
  colorHex?: string;
  colorName?: string;
  size: string;
  sizeName?: string;
  material?: string;
  style?: string;
  costPrice: number;
  sellPrice: number;
  weightGrams?: number;
  imageUrl?: string;
  barcode?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface ProductQuery {
  sellerId?: string;
  categoryId?: string;
  status?: ProductStatus;
  search?: string;
  page?: number;
  limit?: number;
}
