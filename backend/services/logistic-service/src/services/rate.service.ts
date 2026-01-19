import { CourierRepository } from '../repositories/courier.repository';
import { RateCacheRepository, CachedRate } from '../repositories/rate-cache.repository';
import { GetRatesDTO, ShippingRateResponse, CourierIntegration, CourierService } from '../types';
import { biteshipClient } from '../config/biteship';

export class RateService {
  private courierRepository: CourierRepository;
  private rateCacheRepository: RateCacheRepository;

  constructor() {
    this.courierRepository = new CourierRepository();
    this.rateCacheRepository = new RateCacheRepository();
  }

  /**
   * Backwards-compatible alias used by controllers.
   */
  async getRates(data: GetRatesDTO): Promise<ShippingRateResponse[]> {
    return this.getShippingRates(data);
  }

  /**
   * Get shipping rates for a given route and weight
   */
  async getShippingRates(data: GetRatesDTO): Promise<ShippingRateResponse[]> {
    const { originPostalCode, destPostalCode, weightGrams, couriers } = data;

    // Get active couriers
    let activeCouriers = await this.courierRepository.findAllCouriers(true);

    // Filter by requested couriers if specified
    if (couriers && couriers.length > 0) {
      activeCouriers = activeCouriers.filter((c: CourierIntegration) => couriers.includes(c.courierCode));
    }

    if (activeCouriers.length === 0) {
      return [];
    }

    const rates: ShippingRateResponse[] = [];
    const missingRates: { courier: string; services: string[] }[] = [];

    // Check cache for each courier's services
    for (const courier of activeCouriers) {
      for (const service of courier.services) {
        const cached = await this.rateCacheRepository.get(
          originPostalCode,
          destPostalCode,
          weightGrams,
          courier.courierCode,
          service.serviceCode
        );

        if (cached) {
          rates.push({
            courier: courier.courierCode,
            courierName: courier.courierName,
            serviceCode: service.serviceCode,
            serviceName: service.serviceName,
            serviceType: service.serviceType,
            rate: Number(cached.rate),
            estimatedDays: cached.estimatedDays,
            supportsCod: courier.supportsCod,
            supportsInsurance: courier.supportsInsurance
          });
        } else {
          // Track missing rates
          const existingMissing = missingRates.find(m => m.courier === courier.courierCode);
          if (existingMissing) {
            existingMissing.services.push(service.serviceCode);
          } else {
            missingRates.push({
              courier: courier.courierCode,
              services: [service.serviceCode]
            });
          }
        }
      }
    }

    // Fetch missing rates from Biteship
    if (missingRates.length > 0) {
      try {
        const biteshipRates = await biteshipClient.getRates({
          originPostalCode,
          destPostalCode,
          weightGrams,
          lengthCm: data.lengthCm,
          widthCm: data.widthCm,
          heightCm: data.heightCm,
          itemValue: data.itemValue,
          couriers: missingRates.map(m => m.courier)
        });

        // Cache and add new rates
        const ratesToCache: CachedRate[] = [];

        for (const rate of biteshipRates) {
          const courier = activeCouriers.find((c: CourierIntegration) => c.courierCode === rate.courierCode);
          if (!courier) continue;

          const service = courier.services.find((s: CourierService) => s.serviceCode === rate.serviceCode);

          // Apply rate multiplier
          const finalRate = rate.rate * Number(courier.rateMultiplier || 1);

          rates.push({
            courier: rate.courierCode,
            courierName: courier.courierName,
            serviceCode: rate.serviceCode,
            serviceName: service?.serviceName || rate.serviceName,
            serviceType: service?.serviceType || null,
            rate: finalRate,
            estimatedDays: rate.estimatedDays || service?.estimatedDays || null,
            supportsCod: courier.supportsCod,
            supportsInsurance: courier.supportsInsurance
          });

          ratesToCache.push({
            originPostalCode,
            destPostalCode,
            weightGrams,
            courier: rate.courierCode,
            serviceCode: rate.serviceCode,
            rate: finalRate,
            estimatedDays: rate.estimatedDays
          });
        }

        // Bulk cache rates
        if (ratesToCache.length > 0) {
          await this.rateCacheRepository.bulkSet(ratesToCache);
        }
      } catch (error: any) {
        console.error('Failed to fetch rates from Biteship:', error.message);
        // Return whatever we have from cache
      }
    }

    // Sort by rate (cheapest first)
    rates.sort((a, b) => a.rate - b.rate);

    return rates;
  }

  /**
   * Public-facing list of active couriers (no secrets like apiKey).
   */
  async getActiveCouriers() {
    const couriers = await this.courierRepository.findAllCouriers(true);

    return couriers.map((courier: CourierIntegration) => ({
      id: courier.id,
      courierCode: courier.courierCode,
      courierName: courier.courierName,
      supportsCod: courier.supportsCod,
      supportsInsurance: courier.supportsInsurance,
      supportsPickup: courier.supportsPickup,
      supportsDropoff: courier.supportsDropoff,
      supportsRealTimeTracking: courier.supportsRealTimeTracking,
      rateMultiplier: courier.rateMultiplier ? Number(courier.rateMultiplier) : 1,
      logoUrl: courier.logoUrl,
      displayOrder: courier.displayOrder,
      services: courier.services.map((service: CourierService) => ({
        id: service.id,
        serviceCode: service.serviceCode,
        serviceName: service.serviceName,
        serviceType: service.serviceType,
        estimatedDays: service.estimatedDays,
        displayOrder: service.displayOrder
      }))
    }));
  }

  /**
   * Clear rate cache for a specific route
   */
  async clearRateCache(originPostalCode: string, destPostalCode: string) {
    return this.rateCacheRepository.clearByRoute(originPostalCode, destPostalCode);
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpiredCache() {
    return this.rateCacheRepository.clearExpired();
  }

  /**
   * Clear all rate cache
   */
  async clearAllCache() {
    return this.rateCacheRepository.clearAll();
  }
}
