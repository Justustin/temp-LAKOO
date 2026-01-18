import { Decimal } from '../generated/prisma/runtime/library';

// =============================================================================
// ADDRESS DTOs
// =============================================================================

export interface CreateAddressDTO {
  userId: string;
  label?: string;
  // Recipient info
  recipientName: string;
  phoneNumber: string;
  alternatePhone?: string;
  // Address details
  streetAddress: string;
  addressLine2?: string;
  rt?: string;
  rw?: string;
  // Location hierarchy
  villageId?: string;
  villageName?: string;
  districtId?: string;
  districtName?: string;
  cityId?: string;
  cityName: string;
  provinceId?: string;
  provinceName: string;
  postalCode: string;
  country?: string;
  countryCode?: string;
  // Coordinates
  latitude?: number;
  longitude?: number;
  geoAccuracy?: string;
  // Courier-specific codes
  biteshipAreaId?: string;
  jneAreaCode?: string;
  jntAreaCode?: string;
  // Settings
  isDefault?: boolean;
  // Delivery notes
  deliveryNotes?: string;
  landmark?: string;
}

export interface UpdateAddressDTO {
  label?: string;
  // Recipient info
  recipientName?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  // Address details
  streetAddress?: string;
  addressLine2?: string;
  rt?: string;
  rw?: string;
  // Location hierarchy
  villageId?: string;
  villageName?: string;
  districtId?: string;
  districtName?: string;
  cityId?: string;
  cityName?: string;
  provinceId?: string;
  provinceName?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  // Coordinates
  latitude?: number;
  longitude?: number;
  geoAccuracy?: string;
  // Courier-specific codes
  biteshipAreaId?: string;
  jneAreaCode?: string;
  jntAreaCode?: string;
  // Settings
  isDefault?: boolean;
  isValidated?: boolean;
  validatedAt?: Date;
  // Delivery notes
  deliveryNotes?: string;
  landmark?: string;
}

export interface AddressResponse {
  id: string;
  userId: string;
  label: string | null;
  recipientName: string;
  phoneNumber: string;
  alternatePhone: string | null;
  streetAddress: string;
  addressLine2: string | null;
  rt: string | null;
  rw: string | null;
  villageId: string | null;
  villageName: string | null;
  districtId: string | null;
  districtName: string | null;
  cityId: string | null;
  cityName: string;
  provinceId: string | null;
  provinceName: string;
  postalCode: string;
  country: string;
  countryCode: string;
  latitude: Decimal | null;
  longitude: Decimal | null;
  geoAccuracy: string | null;
  biteshipAreaId: string | null;
  jneAreaCode: string | null;
  jntAreaCode: string | null;
  isDefault: boolean;
  isValidated: boolean;
  validatedAt: Date | null;
  deliveryNotes: string | null;
  landmark: string | null;
  lastUsedAt: Date | null;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// LOCATION DTOs (Indonesian Location Data)
// =============================================================================

export interface ProvinceDTO {
  id: string;
  code: string;
  name: string;
  altNames: string[];
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export interface CityDTO {
  id: string;
  provinceId: string;
  code: string;
  name: string;
  type: 'kota' | 'kabupaten';
  altNames: string[];
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export interface DistrictDTO {
  id: string;
  cityId: string;
  code: string;
  name: string;
  altNames: string[];
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export interface VillageDTO {
  id: string;
  districtId: string;
  code: string;
  name: string;
  type: 'kelurahan' | 'desa';
  postalCode?: string;
  altNames: string[];
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

// =============================================================================
// POSTAL CODE DTOs
// =============================================================================

export interface PostalCodeDTO {
  id: string;
  postalCode: string;
  villageName?: string;
  districtName?: string;
  cityName: string;
  provinceName: string;
  latitude?: number;
  longitude?: number;
  biteshipAreaId?: string;
}

// =============================================================================
// ADDRESS VALIDATION DTOs
// =============================================================================

export interface ValidateAddressDTO {
  streetAddress: string;
  cityName: string;
  postalCode: string;
}

export interface AddressValidationResultDTO {
  isValid: boolean;
  validatedAddress?: string;
  validatedCity?: string;
  validatedProvince?: string;
  validatedPostalCode?: string;
  latitude?: number;
  longitude?: number;
  confidence?: number;
  biteshipAreaId?: string;
  validationSource?: string;
}
