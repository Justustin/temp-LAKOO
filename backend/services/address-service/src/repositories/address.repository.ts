import { prisma } from '../lib/prisma';
import { CreateAddressDTO, UpdateAddressDTO } from '../types';
import { Prisma } from '../generated/prisma';

export class AddressRepository {
  /**
   * Serialize "default address" mutations per user to avoid ending up with multiple defaults
   * under concurrent requests.
   *
   * Postgres advisory lock is scoped to the current transaction (xact lock).
   */
  private async lockUserDefaultMutation(tx: Prisma.TransactionClient, userId: string) {
    // hashtext() returns int4; cast to bigint for pg_advisory_xact_lock(bigint)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;
  }

  /**
   * Create a new address for a user
   * Uses transaction when setting as default to prevent race conditions
   */
  async create(data: CreateAddressDTO) {
    // If setting as default, use transaction to ensure atomicity
    if (data.isDefault) {
      return prisma.$transaction(async (tx) => {
        await this.lockUserDefaultMutation(tx, data.userId);

        // Unset other defaults first
        await tx.address.updateMany({
          where: {
            userId: data.userId,
            deletedAt: null
          },
          data: { isDefault: false }
        });

        // Create the new address
        return tx.address.create({
          data: this.buildCreateData(data)
        });
      });
    }

    // No default handling needed, simple create
    return prisma.address.create({
      data: this.buildCreateData(data)
    });
  }

  /**
   * Build the Prisma create data from DTO
   */
  private buildCreateData(data: CreateAddressDTO): Prisma.AddressCreateInput {
    return {
      userId: data.userId,
      label: data.label,
      recipientName: data.recipientName,
      phoneNumber: data.phoneNumber,
      alternatePhone: data.alternatePhone,
      streetAddress: data.streetAddress,
      addressLine2: data.addressLine2,
      rt: data.rt,
      rw: data.rw,
      villageId: data.villageId,
      villageName: data.villageName,
      districtId: data.districtId,
      districtName: data.districtName,
      cityId: data.cityId,
      cityName: data.cityName,
      provinceId: data.provinceId,
      provinceName: data.provinceName,
      postalCode: data.postalCode,
      country: data.country || 'Indonesia',
      countryCode: data.countryCode || 'ID',
      // Fix: use !== undefined to handle 0 as valid coordinate
      latitude: data.latitude !== undefined ? new Prisma.Decimal(data.latitude) : null,
      longitude: data.longitude !== undefined ? new Prisma.Decimal(data.longitude) : null,
      geoAccuracy: data.geoAccuracy,
      biteshipAreaId: data.biteshipAreaId,
      jneAreaCode: data.jneAreaCode,
      jntAreaCode: data.jntAreaCode,
      isDefault: data.isDefault || false,
      deliveryNotes: data.deliveryNotes,
      landmark: data.landmark
    };
  }

  /**
   * Find an address by ID (excludes soft-deleted)
   */
  async findById(id: string) {
    return prisma.address.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });
  }

  /**
   * Find all addresses for a user (excludes soft-deleted)
   */
  async findByUserId(userId: string) {
    return prisma.address.findMany({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: [
        { isDefault: 'desc' },
        { lastUsedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  /**
   * Find the default address for a user
   */
  async findDefaultByUserId(userId: string) {
    return prisma.address.findFirst({
      where: {
        userId,
        isDefault: true,
        deletedAt: null
      },
      // If a bug ever creates multiple defaults, make the selection deterministic
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Update an address
   */
  async update(id: string, data: UpdateAddressDTO) {
    const updateData: Prisma.AddressUpdateInput = {};

    // Only include fields that are provided
    if (data.label !== undefined) updateData.label = data.label;
    if (data.recipientName !== undefined) updateData.recipientName = data.recipientName;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.alternatePhone !== undefined) updateData.alternatePhone = data.alternatePhone;
    if (data.streetAddress !== undefined) updateData.streetAddress = data.streetAddress;
    if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2;
    if (data.rt !== undefined) updateData.rt = data.rt;
    if (data.rw !== undefined) updateData.rw = data.rw;
    if (data.villageId !== undefined) updateData.villageId = data.villageId;
    if (data.villageName !== undefined) updateData.villageName = data.villageName;
    if (data.districtId !== undefined) updateData.districtId = data.districtId;
    if (data.districtName !== undefined) updateData.districtName = data.districtName;
    if (data.cityId !== undefined) updateData.cityId = data.cityId;
    if (data.cityName !== undefined) updateData.cityName = data.cityName;
    if (data.provinceId !== undefined) updateData.provinceId = data.provinceId;
    if (data.provinceName !== undefined) updateData.provinceName = data.provinceName;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.countryCode !== undefined) updateData.countryCode = data.countryCode;
    // Fix: use !== undefined to handle 0 as valid coordinate
    if (data.latitude !== undefined) updateData.latitude = data.latitude !== null ? new Prisma.Decimal(data.latitude) : null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude !== null ? new Prisma.Decimal(data.longitude) : null;
    if (data.geoAccuracy !== undefined) updateData.geoAccuracy = data.geoAccuracy;
    if (data.biteshipAreaId !== undefined) updateData.biteshipAreaId = data.biteshipAreaId;
    if (data.jneAreaCode !== undefined) updateData.jneAreaCode = data.jneAreaCode;
    if (data.jntAreaCode !== undefined) updateData.jntAreaCode = data.jntAreaCode;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.isValidated !== undefined) updateData.isValidated = data.isValidated;
    if (data.validatedAt !== undefined) updateData.validatedAt = data.validatedAt;
    if (data.deliveryNotes !== undefined) updateData.deliveryNotes = data.deliveryNotes;
    if (data.landmark !== undefined) updateData.landmark = data.landmark;

    return prisma.address.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Set an address as default (unsets all others for the user)
   * Uses transaction to prevent race conditions with multiple defaults
   */
  async setAsDefault(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      await this.lockUserDefaultMutation(tx, userId);

      // Unset all other defaults for this user
      await tx.address.updateMany({
        where: {
          userId,
          deletedAt: null
        },
        data: { isDefault: false }
      });

      // Set this one as default
      return tx.address.update({
        where: { id },
        data: { isDefault: true }
      });
    });
  }

  /**
   * Soft delete an address and optionally set new default
   * Uses transaction when switching default to prevent race conditions
   */
  async softDeleteWithDefaultSwitch(id: string, userId: string, newDefaultId?: string) {
    return prisma.$transaction(async (tx) => {
      await this.lockUserDefaultMutation(tx, userId);

      // If we need to switch default, do it first
      if (newDefaultId) {
        await tx.address.updateMany({
          where: {
            userId,
            deletedAt: null
          },
          data: { isDefault: false }
        });

        await tx.address.update({
          where: { id: newDefaultId },
          data: { isDefault: true }
        });
      }

      // Soft delete the address
      return tx.address.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    });
  }

  /**
   * Soft delete an address (simple version without default switch)
   */
  async softDelete(id: string) {
    return prisma.address.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Hard delete an address (use with caution)
   */
  async hardDelete(id: string) {
    return prisma.address.delete({
      where: { id }
    });
  }

  /**
   * Update usage tracking when address is used
   */
  async markAsUsed(id: string) {
    return prisma.address.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 }
      }
    });
  }

  /**
   * Count addresses for a user
   */
  async countByUserId(userId: string) {
    return prisma.address.count({
      where: {
        userId,
        deletedAt: null
      }
    });
  }
}
