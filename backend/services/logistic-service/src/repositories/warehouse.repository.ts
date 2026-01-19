import { prisma } from '../lib/prisma';
import { CreateWarehouseDTO, UpdateWarehouseDTO } from '../types';
import { Prisma } from '../generated/prisma';

export class WarehouseRepository {
  /**
   * Serialize "default warehouse" mutations to avoid multiple defaults under concurrency.
   * Uses a Postgres advisory transaction lock.
   */
  private async lockDefaultWarehouse(tx: Prisma.TransactionClient) {
    // Constant lock key for this service
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(424242::bigint)`;
  }

  async create(data: CreateWarehouseDTO) {
    // If this is set as default, unset other defaults first
    if (data.isDefault) {
      return prisma.$transaction(async (tx) => {
        await this.lockDefaultWarehouse(tx);
        await tx.warehouseLocation.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });

        return tx.warehouseLocation.create({
          data: {
            code: data.code,
            name: data.name,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            address: data.address,
            district: data.district,
            city: data.city,
            province: data.province,
            postalCode: data.postalCode,
            latitude: data.latitude,
            longitude: data.longitude,
            isDefault: true,
            isActive: data.isActive ?? true,
            operatingHours: data.operatingHours
          }
        });
      });
    }

    return prisma.warehouseLocation.create({
      data: {
        code: data.code,
        name: data.name,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        address: data.address,
        district: data.district,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
        operatingHours: data.operatingHours
      }
    });
  }

  async findById(id: string) {
    return prisma.warehouseLocation.findUnique({
      where: { id }
    });
  }

  async findByCode(code: string) {
    return prisma.warehouseLocation.findUnique({
      where: { code }
    });
  }

  async findDefault() {
    return prisma.warehouseLocation.findFirst({
      where: { isDefault: true, isActive: true }
    });
  }

  async findAll(activeOnly: boolean = false) {
    return prisma.warehouseLocation.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  async update(id: string, data: UpdateWarehouseDTO) {
    // If this is being set as default, unset other defaults first
    if (data.isDefault) {
      return prisma.$transaction(async (tx) => {
        await this.lockDefaultWarehouse(tx);
        await tx.warehouseLocation.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false }
        });

        return tx.warehouseLocation.update({
          where: { id },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.contactName !== undefined && { contactName: data.contactName }),
            ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
            ...(data.address !== undefined && { address: data.address }),
            ...(data.district !== undefined && { district: data.district }),
            ...(data.city !== undefined && { city: data.city }),
            ...(data.province !== undefined && { province: data.province }),
            ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
            ...(data.latitude !== undefined && { latitude: data.latitude }),
            ...(data.longitude !== undefined && { longitude: data.longitude }),
            ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
            ...(data.operatingHours !== undefined && { operatingHours: data.operatingHours })
          }
        });
      });
    }

    return prisma.warehouseLocation.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.district !== undefined && { district: data.district }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.province !== undefined && { province: data.province }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.operatingHours !== undefined && { operatingHours: data.operatingHours })
      }
    });
  }

  async delete(id: string) {
    return prisma.warehouseLocation.delete({
      where: { id }
    });
  }

  async setDefault(id: string) {
    return prisma.$transaction(async (tx) => {
      await this.lockDefaultWarehouse(tx);

      // Unset all current defaults
      await tx.warehouseLocation.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });

      // Set new default
      return tx.warehouseLocation.update({
        where: { id },
        data: { isDefault: true }
      });
    });
  }
}
