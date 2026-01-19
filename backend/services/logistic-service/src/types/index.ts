import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// Enums (matching Prisma schema)
// =============================================================================

export type ShipmentStatus =
  | 'pending'
  | 'booked'
  | 'awaiting_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'at_destination_hub'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'cancelled';

// =============================================================================
// Address DTOs
// =============================================================================

export interface AddressDTO {
  name: string;
  phone: string;
  address: string;
  district?: string;
  city: string;
  province: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

// =============================================================================
// Shipment DTOs
// =============================================================================

export interface CreateShipmentDTO {
  orderId: string;
  userId: string;
  returnId?: string;
  // Courier info
  courier: string;
  courierName?: string;
  serviceType?: string;
  serviceName?: string;
  // Costs
  shippingCost: number;
  insuranceCost?: number;
  codAmount?: number;
  // Package info
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  itemCount?: number;
  itemDescription?: string;
  // Addresses
  origin: AddressDTO;
  destination: AddressDTO;
  // Optional
  instructions?: string;
  metadata?: Record<string, any>;
}

export interface UpdateShipmentDTO {
  trackingNumber?: string;
  waybillId?: string;
  biteshipOrderId?: string;
  status?: ShipmentStatus;
  estimatedDelivery?: Date | string;
  failureReason?: string;
  receiverName?: string;
  proofOfDeliveryUrl?: string;
  signature?: string;
  internalNotes?: string;
  metadata?: Record<string, any>;
}

export interface BookShipmentDTO {
  shipmentId: string;
  trackingNumber?: string;
  waybillId?: string;
  biteshipOrderId?: string;
  estimatedDelivery?: Date | string;
}

export interface ShipmentResponse {
  id: string;
  shipmentNumber: string;
  orderId: string;
  userId: string;
  courier: string;
  courierName: string | null;
  serviceType: string | null;
  serviceName: string | null;
  trackingNumber: string | null;
  status: ShipmentStatus;
  shippingCost: Decimal;
  totalCost: Decimal;
  estimatedDelivery: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Tracking DTOs
// =============================================================================

export interface CreateTrackingEventDTO {
  shipmentId: string;
  status: string;
  statusCode?: string;
  description?: string;
  location?: string;
  city?: string;
  courierStatus?: string;
  eventTime: Date | string;
  source?: 'webhook' | 'api_poll' | 'manual';
  rawPayload?: Record<string, any>;
}

export interface TrackingEventResponse {
  id: string;
  shipmentId: string;
  status: string;
  description: string | null;
  location: string | null;
  city: string | null;
  eventTime: Date;
  source: string;
  createdAt: Date;
}

// =============================================================================
// Shipping Rate DTOs
// =============================================================================

export interface GetRatesDTO {
  originPostalCode: string;
  destPostalCode: string;
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  itemValue?: number;
  couriers?: string[]; // Filter by specific couriers
}

export interface ShippingRateResponse {
  courier: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  serviceType: string | null;
  rate: number;
  estimatedDays: string | null;
  supportsCod: boolean;
  supportsInsurance: boolean;
}

// =============================================================================
// Courier DTOs
// =============================================================================

export interface CreateCourierDTO {
  courierCode: string;
  courierName: string;
  isActive?: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  supportsCod?: boolean;
  supportsInsurance?: boolean;
  supportsPickup?: boolean;
  supportsDropoff?: boolean;
  supportsRealTimeTracking?: boolean;
  hasFixedRates?: boolean;
  rateMultiplier?: number;
  logoUrl?: string;
  displayOrder?: number;
  pickupCutoffTime?: string;
  settings?: Record<string, any>;
}

export interface UpdateCourierDTO {
  courierName?: string;
  isActive?: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  supportsCod?: boolean;
  supportsInsurance?: boolean;
  supportsPickup?: boolean;
  supportsDropoff?: boolean;
  supportsRealTimeTracking?: boolean;
  hasFixedRates?: boolean;
  rateMultiplier?: number;
  logoUrl?: string;
  displayOrder?: number;
  pickupCutoffTime?: string;
  settings?: Record<string, any>;
}

export interface CreateCourierServiceDTO {
  courierId: string;
  serviceCode: string;
  serviceName: string;
  serviceType?: string;
  estimatedDays?: string;
  isActive?: boolean;
  displayOrder?: number;
}

// =============================================================================
// Courier Entity Types (matching Prisma models)
// =============================================================================

export interface CourierService {
  id: string;
  courierId: string;
  serviceCode: string;
  serviceName: string;
  serviceType: string | null;
  estimatedDays: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
}

export interface CourierIntegration {
  id: string;
  courierCode: string;
  courierName: string;
  isActive: boolean;
  apiEndpoint: string | null;
  apiKey: string | null;
  supportsCod: boolean;
  supportsInsurance: boolean;
  supportsPickup: boolean;
  supportsDropoff: boolean;
  supportsRealTimeTracking: boolean;
  hasFixedRates: boolean;
  rateMultiplier: import('@prisma/client/runtime/library').Decimal | null;
  logoUrl: string | null;
  displayOrder: number;
  pickupCutoffTime: string | null;
  settings: any;
  createdAt: Date;
  updatedAt: Date;
  services: CourierService[];
}

// =============================================================================
// Warehouse Location DTOs
// =============================================================================

export interface CreateWarehouseDTO {
  code: string;
  name: string;
  contactName: string;
  contactPhone: string;
  address: string;
  district?: string;
  city: string;
  province: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  isActive?: boolean;
  operatingHours?: string;
}

export interface UpdateWarehouseDTO {
  name?: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  isActive?: boolean;
  operatingHours?: string;
}

// =============================================================================
// Biteship Webhook DTOs
// =============================================================================

export interface BiteshipWebhookPayload {
  event: string;
  courier_tracking_id?: string;
  courier_waybill_id?: string;
  courier_company?: string;
  courier_type?: string;
  order_id?: string;
  status?: string;
  note?: string;
  updated_at?: string;
  // Additional tracking info
  tracking?: {
    status: string;
    note?: string;
    updated_at: string;
    location?: {
      name?: string;
      city?: string;
      province?: string;
    };
  };
}

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
