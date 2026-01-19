import { prisma } from '../lib/prisma';

export interface CachedRate {
  originPostalCode: string;
  destPostalCode: string;
  weightGrams: number;
  courier: string;
  serviceCode: string;
  rate: number;
  estimatedDays?: string;
}

export class RateCacheRepository {
  private readonly defaultTtlHours = 24;

  async get(
    originPostalCode: string,
    destPostalCode: string,
    weightGrams: number,
    courier: string,
    serviceCode: string
  ) {
    const cached = await prisma.shippingRateCache.findUnique({
      where: {
        originPostalCode_destPostalCode_weightGrams_courier_serviceCode: {
          originPostalCode,
          destPostalCode,
          weightGrams,
          courier,
          serviceCode
        }
      }
    });

    // Return null if expired
    if (cached && cached.expiresAt < new Date()) {
      await this.delete(cached.id);
      return null;
    }

    return cached;
  }

  async set(data: CachedRate, ttlHours?: number) {
    const ttl = ttlHours || parseInt(process.env.RATE_CACHE_TTL_HOURS || String(this.defaultTtlHours));
    const expiresAt = new Date(Date.now() + ttl * 60 * 60 * 1000);

    return prisma.shippingRateCache.upsert({
      where: {
        originPostalCode_destPostalCode_weightGrams_courier_serviceCode: {
          originPostalCode: data.originPostalCode,
          destPostalCode: data.destPostalCode,
          weightGrams: data.weightGrams,
          courier: data.courier,
          serviceCode: data.serviceCode
        }
      },
      create: {
        originPostalCode: data.originPostalCode,
        destPostalCode: data.destPostalCode,
        weightGrams: data.weightGrams,
        courier: data.courier,
        serviceCode: data.serviceCode,
        rate: data.rate,
        estimatedDays: data.estimatedDays,
        expiresAt
      },
      update: {
        rate: data.rate,
        estimatedDays: data.estimatedDays,
        expiresAt
      }
    });
  }

  async bulkSet(rates: CachedRate[], ttlHours?: number) {
    const ttl = ttlHours || parseInt(process.env.RATE_CACHE_TTL_HOURS || String(this.defaultTtlHours));
    const expiresAt = new Date(Date.now() + ttl * 60 * 60 * 1000);

    // Use transaction for bulk upsert
    const operations = rates.map(rate =>
      prisma.shippingRateCache.upsert({
        where: {
          originPostalCode_destPostalCode_weightGrams_courier_serviceCode: {
            originPostalCode: rate.originPostalCode,
            destPostalCode: rate.destPostalCode,
            weightGrams: rate.weightGrams,
            courier: rate.courier,
            serviceCode: rate.serviceCode
          }
        },
        create: {
          originPostalCode: rate.originPostalCode,
          destPostalCode: rate.destPostalCode,
          weightGrams: rate.weightGrams,
          courier: rate.courier,
          serviceCode: rate.serviceCode,
          rate: rate.rate,
          estimatedDays: rate.estimatedDays,
          expiresAt
        },
        update: {
          rate: rate.rate,
          estimatedDays: rate.estimatedDays,
          expiresAt
        }
      })
    );

    return prisma.$transaction(operations);
  }

  async delete(id: string) {
    return prisma.shippingRateCache.delete({
      where: { id }
    });
  }

  async clearExpired() {
    return prisma.shippingRateCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }

  async clearAll() {
    return prisma.shippingRateCache.deleteMany({});
  }

  async clearByRoute(originPostalCode: string, destPostalCode: string) {
    return prisma.shippingRateCache.deleteMany({
      where: {
        originPostalCode,
        destPostalCode
      }
    });
  }
}
