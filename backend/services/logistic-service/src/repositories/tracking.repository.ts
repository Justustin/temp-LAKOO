import { prisma } from '../lib/prisma';
import { CreateTrackingEventDTO } from '../types';

export class TrackingRepository {
  async create(data: CreateTrackingEventDTO) {
    return prisma.trackingEvent.create({
      data: {
        shipmentId: data.shipmentId,
        status: data.status,
        statusCode: data.statusCode,
        description: data.description,
        location: data.location,
        city: data.city,
        courierStatus: data.courierStatus,
        eventTime: new Date(data.eventTime),
        source: data.source || 'webhook',
        rawPayload: data.rawPayload
      }
    });
  }

  async findByShipmentId(shipmentId: string) {
    return prisma.trackingEvent.findMany({
      where: { shipmentId },
      orderBy: { eventTime: 'desc' }
    });
  }

  async findById(id: string) {
    return prisma.trackingEvent.findUnique({
      where: { id }
    });
  }

  async getLatestByShipmentId(shipmentId: string) {
    return prisma.trackingEvent.findFirst({
      where: { shipmentId },
      orderBy: { eventTime: 'desc' }
    });
  }

  async bulkCreate(events: CreateTrackingEventDTO[]) {
    return prisma.trackingEvent.createMany({
      data: events.map(event => ({
        shipmentId: event.shipmentId,
        status: event.status,
        statusCode: event.statusCode,
        description: event.description,
        location: event.location,
        city: event.city,
        courierStatus: event.courierStatus,
        eventTime: new Date(event.eventTime),
        source: event.source || 'webhook',
        rawPayload: event.rawPayload
      })),
      skipDuplicates: true
    });
  }

  async deleteByShipmentId(shipmentId: string) {
    return prisma.trackingEvent.deleteMany({
      where: { shipmentId }
    });
  }
}
