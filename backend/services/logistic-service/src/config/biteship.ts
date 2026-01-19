import axios, { AxiosInstance } from 'axios';

interface BiteshipRateRequest {
  originPostalCode: string;
  destPostalCode: string;
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  itemValue?: number;
  couriers?: string[];
}

interface BiteshipRateResponse {
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  rate: number;
  estimatedDays?: string;
}

interface BiteshipCreateOrderRequest {
  shipmentId: string;
  courier: string;
  serviceType: string;
  origin: {
    name: string;
    phone: string;
    address: string;
    postalCode: string;
    city?: string;
    province?: string;
    latitude?: number;
    longitude?: number;
  };
  destination: {
    name: string;
    phone: string;
    address: string;
    postalCode: string;
    city?: string;
    province?: string;
    latitude?: number;
    longitude?: number;
  };
  items: {
    name: string;
    quantity: number;
    weight: number;
    value?: number;
  }[];
  notes?: string;
}

interface BiteshipCreateOrderResponse {
  orderId: string;
  waybillId: string;
  trackingNumber: string;
  estimatedDelivery?: string;
}

interface BiteshipTrackingResponse {
  status: string;
  statusCode?: string;
  description?: string;
  location?: string;
  city?: string;
  timestamp: string;
}

class BiteshipClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.BITESHIP_BASE_URL || 'https://api.biteship.com/v1';
    const apiKey = process.env.BITESHIP_API_KEY;

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get shipping rates from Biteship
   */
  async getRates(request: BiteshipRateRequest): Promise<BiteshipRateResponse[]> {
    try {
      // Build request payload
      const payload = {
        origin_postal_code: request.originPostalCode,
        destination_postal_code: request.destPostalCode,
        items: [{
          weight: request.weightGrams,
          length: request.lengthCm || 10,
          width: request.widthCm || 10,
          height: request.heightCm || 10,
          value: request.itemValue || 100000
        }],
        couriers: request.couriers?.join(',') || 'jne,jnt,sicepat,anteraja'
      };

      const response = await this.client.post('/rates/couriers', payload);

      if (!response.data?.pricing) {
        return [];
      }

      // Map Biteship response to our format
      return response.data.pricing.map((p: any) => ({
        courierCode: p.courier_code,
        courierName: p.courier_name,
        serviceCode: p.courier_service_code,
        serviceName: p.courier_service_name,
        rate: p.price,
        estimatedDays: p.duration || `${p.min_day || 1}-${p.max_day || 3}`
      }));
    } catch (error: any) {
      console.error('Biteship getRates error:', error.response?.data || error.message);
      throw new Error(`Failed to get rates from Biteship: ${error.message}`);
    }
  }

  /**
   * Create a shipping order with Biteship
   */
  async createOrder(request: BiteshipCreateOrderRequest): Promise<BiteshipCreateOrderResponse> {
    try {
      const payload = {
        shipper_contact_name: request.origin.name,
        shipper_contact_phone: request.origin.phone,
        shipper_contact_email: 'shipping@lakoo.id',
        shipper_organization: 'LAKOO',
        origin_contact_name: request.origin.name,
        origin_contact_phone: request.origin.phone,
        origin_address: request.origin.address,
        origin_postal_code: request.origin.postalCode,
        origin_coordinate: request.origin.latitude && request.origin.longitude
          ? { latitude: request.origin.latitude, longitude: request.origin.longitude }
          : undefined,
        destination_contact_name: request.destination.name,
        destination_contact_phone: request.destination.phone,
        destination_address: request.destination.address,
        destination_postal_code: request.destination.postalCode,
        destination_coordinate: request.destination.latitude && request.destination.longitude
          ? { latitude: request.destination.latitude, longitude: request.destination.longitude }
          : undefined,
        courier_company: request.courier,
        courier_type: request.serviceType,
        delivery_type: 'now',
        items: request.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          weight: item.weight,
          value: item.value || 100000
        })),
        reference_id: request.shipmentId,
        note: request.notes
      };

      const response = await this.client.post('/orders', payload);

      return {
        orderId: response.data.id,
        waybillId: response.data.courier?.waybill_id || '',
        trackingNumber: response.data.courier?.tracking_id || '',
        estimatedDelivery: response.data.courier?.estimated_delivery_at
      };
    } catch (error: any) {
      console.error('Biteship createOrder error:', error.response?.data || error.message);
      throw new Error(`Failed to create Biteship order: ${error.message}`);
    }
  }

  /**
   * Get tracking info from Biteship
   */
  async getTracking(waybillId: string): Promise<BiteshipTrackingResponse[]> {
    try {
      const response = await this.client.get(`/trackings/${waybillId}`);

      if (!response.data?.history) {
        return [];
      }

      return response.data.history.map((h: any) => ({
        status: h.status,
        statusCode: h.service_type,
        description: h.note,
        location: h.location?.name,
        city: h.location?.city,
        timestamp: h.updated_at
      }));
    } catch (error: any) {
      console.error('Biteship getTracking error:', error.response?.data || error.message);
      throw new Error(`Failed to get tracking from Biteship: ${error.message}`);
    }
  }

  /**
   * Cancel a Biteship order
   */
  async cancelOrder(orderId: string, reason: string): Promise<boolean> {
    try {
      await this.client.delete(`/orders/${orderId}`, {
        data: { reason }
      });
      return true;
    } catch (error: any) {
      console.error('Biteship cancelOrder error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.BITESHIP_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('BITESHIP_WEBHOOK_SECRET not configured');
      return process.env.NODE_ENV === 'development';
    }

    // In production, implement proper HMAC verification
    // This is a placeholder - Biteship uses different verification methods
    return true;
  }
}

// Singleton instance
export const biteshipClient = new BiteshipClient();
