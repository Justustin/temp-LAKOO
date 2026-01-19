import { prisma } from '../lib/prisma';
import { CreateShipmentDTO, UpdateShipmentDTO, ShipmentStatus, PaginationOptions } from '../types';
import { Prisma } from '../generated/prisma';

export class ShipmentRepository {
  private generateShipmentNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `SHP-${dateStr}-${random}`;
  }

  async create(data: CreateShipmentDTO) {
    const shipmentNumber = this.generateShipmentNumber();
    const totalCost = data.shippingCost + (data.insuranceCost || 0);

    return prisma.shipment.create({
      data: {
        shipmentNumber,
        orderId: data.orderId,
        userId: data.userId,
        returnId: data.returnId,
        // Courier info
        courier: data.courier,
        courierName: data.courierName,
        serviceType: data.serviceType,
        serviceName: data.serviceName,
        // Costs
        shippingCost: data.shippingCost,
        insuranceCost: data.insuranceCost || 0,
        codAmount: data.codAmount || 0,
        totalCost,
        // Package info
        weightGrams: data.weightGrams,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        itemCount: data.itemCount || 1,
        itemDescription: data.itemDescription,
        // Origin address
        originName: data.origin.name,
        originPhone: data.origin.phone,
        originAddress: data.origin.address,
        originDistrict: data.origin.district,
        originCity: data.origin.city,
        originProvince: data.origin.province,
        originPostalCode: data.origin.postalCode,
        originLatitude: data.origin.latitude,
        originLongitude: data.origin.longitude,
        // Destination address
        destName: data.destination.name,
        destPhone: data.destination.phone,
        destAddress: data.destination.address,
        destDistrict: data.destination.district,
        destCity: data.destination.city,
        destProvince: data.destination.province,
        destPostalCode: data.destination.postalCode,
        destLatitude: data.destination.latitude,
        destLongitude: data.destination.longitude,
        // Optional
        instructions: data.instructions,
        metadata: data.metadata,
        status: 'pending'
      },
      include: {
        trackingEvents: true
      }
    });
  }

  async findById(id: string) {
    return prisma.shipment.findUnique({
      where: { id },
      include: {
        trackingEvents: {
          orderBy: { eventTime: 'desc' }
        }
      }
    });
  }

  async findByShipmentNumber(shipmentNumber: string) {
    return prisma.shipment.findUnique({
      where: { shipmentNumber },
      include: {
        trackingEvents: {
          orderBy: { eventTime: 'desc' }
        }
      }
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.shipment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: {
        trackingEvents: {
          orderBy: { eventTime: 'desc' }
        }
      }
    });
  }

  async findByTrackingNumber(trackingNumber: string) {
    return prisma.shipment.findFirst({
      where: { trackingNumber },
      include: {
        trackingEvents: {
          orderBy: { eventTime: 'desc' }
        }
      }
    });
  }

  async findByBiteshipOrderId(biteshipOrderId: string) {
    return prisma.shipment.findFirst({
      where: { biteshipOrderId }
    });
  }

  async findByUserId(userId: string, options?: PaginationOptions) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          trackingEvents: {
            orderBy: { eventTime: 'desc' },
            take: 1 // Only get latest tracking event
          }
        }
      }),
      prisma.shipment.count({ where: { userId } })
    ]);

    return {
      data: shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findAll(options?: PaginationOptions & { status?: ShipmentStatus }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ShipmentWhereInput = {};
    if (options?.status) {
      where.status = options.status;
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          trackingEvents: {
            orderBy: { eventTime: 'desc' },
            take: 1
          }
        }
      }),
      prisma.shipment.count({ where })
    ]);

    return {
      data: shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async update(id: string, data: UpdateShipmentDTO) {
    return prisma.shipment.update({
      where: { id },
      data: {
        ...(data.trackingNumber && { trackingNumber: data.trackingNumber }),
        ...(data.waybillId && { waybillId: data.waybillId }),
        ...(data.biteshipOrderId && { biteshipOrderId: data.biteshipOrderId }),
        ...(data.status && { status: data.status }),
        ...(data.estimatedDelivery && { estimatedDelivery: new Date(data.estimatedDelivery) }),
        ...(data.failureReason !== undefined && { failureReason: data.failureReason }),
        ...(data.receiverName !== undefined && { receiverName: data.receiverName }),
        ...(data.proofOfDeliveryUrl !== undefined && { proofOfDeliveryUrl: data.proofOfDeliveryUrl }),
        ...(data.signature !== undefined && { signature: data.signature }),
        ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes }),
        ...(data.metadata !== undefined && { metadata: data.metadata })
      },
      include: {
        trackingEvents: {
          orderBy: { eventTime: 'desc' }
        }
      }
    });
  }

  async updateStatus(id: string, status: ShipmentStatus, additionalData?: Partial<UpdateShipmentDTO>) {
    const now = new Date();
    const updateData: Prisma.ShipmentUpdateInput = {
      status,
      ...additionalData
    };

    // Update timestamp based on status
    switch (status) {
      case 'booked':
        updateData.bookedAt = now;
        break;
      case 'picked_up':
        updateData.pickedUpAt = now;
        break;
      case 'in_transit':
        updateData.inTransitAt = now;
        break;
      case 'out_for_delivery':
        updateData.outForDeliveryAt = now;
        break;
      case 'delivered':
        updateData.deliveredAt = now;
        break;
      case 'failed':
        updateData.failedAt = now;
        break;
      case 'returned':
        updateData.returnedAt = now;
        break;
    }

    return prisma.shipment.update({
      where: { id },
      data: updateData,
      include: {
        trackingEvents: {
          orderBy: { eventTime: 'desc' }
        }
      }
    });
  }

  async markBooked(id: string, trackingNumber: string, waybillId?: string, biteshipOrderId?: string, estimatedDelivery?: Date) {
    return this.updateStatus(id, 'booked', {
      trackingNumber,
      waybillId,
      biteshipOrderId,
      estimatedDelivery: estimatedDelivery?.toISOString()
    });
  }

  async markDelivered(id: string, receiverName?: string, proofOfDeliveryUrl?: string, signature?: string) {
    return this.updateStatus(id, 'delivered', {
      receiverName,
      proofOfDeliveryUrl,
      signature
    });
  }

  async markFailed(id: string, failureReason: string) {
    return this.updateStatus(id, 'failed', { failureReason });
  }

  async markCancelled(id: string) {
    return this.updateStatus(id, 'cancelled');
  }

  async getShipmentStats(startDate: Date, endDate: Date) {
    const [byStatus, totals] = await Promise.all([
      prisma.shipment.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: true
      }),
      prisma.shipment.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          shippingCost: true,
          insuranceCost: true,
          totalCost: true
        },
        _count: true
      })
    ]);

    return {
      byStatus,
      totals: {
        count: totals._count,
        totalShippingCost: totals._sum.shippingCost || 0,
        totalInsuranceCost: totals._sum.insuranceCost || 0,
        totalCost: totals._sum.totalCost || 0
      }
    };
  }
}
