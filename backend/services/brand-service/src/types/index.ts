export type BrandStatus = 'active' | 'inactive' | 'draft';

// Brand DTOs
export interface CreateBrandDTO {
  brandCode: string;
  brandName: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  brandStory?: string;
  tagline?: string;
  targetAudience?: string;
  styleCategory?: string;
  defaultMarginPercent?: number;
  displayOrder?: number;
}

export interface UpdateBrandDTO {
  brandName?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  brandStory?: string;
  tagline?: string;
  targetAudience?: string;
  styleCategory?: string;
  defaultMarginPercent?: number;
  status?: BrandStatus;
  displayOrder?: number;
}

export interface BrandQuery {
  status?: BrandStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// Brand Product DTOs
export interface AddBrandProductDTO {
  productId: string;
  brandPrice: number;
  brandComparePrice?: number;
  discountPercent?: number;
  brandProductName?: string;
  brandDescription?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
}

export interface UpdateBrandProductDTO {
  brandPrice?: number;
  brandComparePrice?: number;
  discountPercent?: number;
  brandProductName?: string;
  brandDescription?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isActive?: boolean;
}

export interface BrandProductQuery {
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
}