import { prisma } from '../lib/prisma';
import { CreateCourierDTO, UpdateCourierDTO, CreateCourierServiceDTO } from '../types';

export class CourierRepository {
  // =============================================================================
  // Courier Integration Methods
  // =============================================================================

  async createCourier(data: CreateCourierDTO) {
    return prisma.courierIntegration.create({
      data: {
        courierCode: data.courierCode,
        courierName: data.courierName,
        isActive: data.isActive ?? true,
        apiEndpoint: data.apiEndpoint,
        apiKey: data.apiKey,
        supportsCod: data.supportsCod ?? false,
        supportsInsurance: data.supportsInsurance ?? true,
        supportsPickup: data.supportsPickup ?? true,
        supportsDropoff: data.supportsDropoff ?? true,
        supportsRealTimeTracking: data.supportsRealTimeTracking ?? true,
        hasFixedRates: data.hasFixedRates ?? false,
        rateMultiplier: data.rateMultiplier ?? 1.00,
        logoUrl: data.logoUrl,
        displayOrder: data.displayOrder ?? 0,
        pickupCutoffTime: data.pickupCutoffTime,
        settings: data.settings
      },
      include: {
        services: true
      }
    });
  }

  async findCourierById(id: string) {
    return prisma.courierIntegration.findUnique({
      where: { id },
      include: {
        services: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
  }

  async findCourierByCode(courierCode: string) {
    return prisma.courierIntegration.findUnique({
      where: { courierCode },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
  }

  async findAllCouriers(activeOnly: boolean = false) {
    return prisma.courierIntegration.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { displayOrder: 'asc' },
      include: {
        services: {
          where: activeOnly ? { isActive: true } : undefined,
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
  }

  async updateCourier(id: string, data: UpdateCourierDTO) {
    return prisma.courierIntegration.update({
      where: { id },
      data: {
        ...(data.courierName !== undefined && { courierName: data.courierName }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.apiEndpoint !== undefined && { apiEndpoint: data.apiEndpoint }),
        ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
        ...(data.supportsCod !== undefined && { supportsCod: data.supportsCod }),
        ...(data.supportsInsurance !== undefined && { supportsInsurance: data.supportsInsurance }),
        ...(data.supportsPickup !== undefined && { supportsPickup: data.supportsPickup }),
        ...(data.supportsDropoff !== undefined && { supportsDropoff: data.supportsDropoff }),
        ...(data.supportsRealTimeTracking !== undefined && { supportsRealTimeTracking: data.supportsRealTimeTracking }),
        ...(data.hasFixedRates !== undefined && { hasFixedRates: data.hasFixedRates }),
        ...(data.rateMultiplier !== undefined && { rateMultiplier: data.rateMultiplier }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.pickupCutoffTime !== undefined && { pickupCutoffTime: data.pickupCutoffTime }),
        ...(data.settings !== undefined && { settings: data.settings })
      },
      include: {
        services: true
      }
    });
  }

  async deleteCourier(id: string) {
    return prisma.courierIntegration.delete({
      where: { id }
    });
  }

  // =============================================================================
  // Courier Service Methods
  // =============================================================================

  async createService(data: CreateCourierServiceDTO) {
    return prisma.courierService.create({
      data: {
        courierId: data.courierId,
        serviceCode: data.serviceCode,
        serviceName: data.serviceName,
        serviceType: data.serviceType,
        estimatedDays: data.estimatedDays,
        isActive: data.isActive ?? true,
        displayOrder: data.displayOrder ?? 0
      }
    });
  }

  async findServiceById(id: string) {
    return prisma.courierService.findUnique({
      where: { id },
      include: {
        courier: true
      }
    });
  }

  async findServicesByCourierId(courierId: string, activeOnly: boolean = false) {
    return prisma.courierService.findMany({
      where: {
        courierId,
        ...(activeOnly && { isActive: true })
      },
      orderBy: { displayOrder: 'asc' }
    });
  }

  async updateService(id: string, data: Partial<CreateCourierServiceDTO>) {
    return prisma.courierService.update({
      where: { id },
      data: {
        ...(data.serviceName !== undefined && { serviceName: data.serviceName }),
        ...(data.serviceType !== undefined && { serviceType: data.serviceType }),
        ...(data.estimatedDays !== undefined && { estimatedDays: data.estimatedDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder })
      }
    });
  }

  async deleteService(id: string) {
    return prisma.courierService.delete({
      where: { id }
    });
  }
}
