import { prisma } from '../lib/prisma';
import { CreateAddressDTO, UpdateAddressDTO } from '../types';
import { Prisma } from '@prisma/client';

export class AddressRepository {
  /**
   * Create a new address for a user
   */
  async create(data: CreateAddressDTO) {
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: data.userId,
          deletedAt: null
        },
        data: { isDefault: false }
      });
    }

    return prisma.address.create({
      data: {
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
        latitude: data.latitude ? new Prisma.Decimal(data.latitude) : null,
        longitude: data.longitude ? new Prisma.Decimal(data.longitude) : null,
        geoAccuracy: data.geoAccuracy,
        biteshipAreaId: data.biteshipAreaId,
        jneAreaCode: data.jneAreaCode,
        jntAreaCode: data.jntAreaCode,
        isDefault: data.isDefault || false,
        deliveryNotes: data.deliveryNotes,
        landmark: data.landmark
      }
    });
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
      }
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
    if (data.latitude !== undefined) updateData.latitude = data.latitude ? new Prisma.Decimal(data.latitude) : null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude ? new Prisma.Decimal(data.longitude) : null;
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
   */
  async setAsDefault(id: string, userId: string) {
    // Unset all other defaults for this user
    await prisma.address.updateMany({
      where: {
        userId,
        deletedAt: null
      },
      data: { isDefault: false }
    });

    // Set this one as default
    return prisma.address.update({
      where: { id },
      data: { isDefault: true }
    });
  }

  /**
   * Soft delete an address
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

// =============================================================================
// LOCATION REPOSITORIES
// =============================================================================

export class ProvinceRepository {
  async findAll(activeOnly = true) {
    return prisma.province.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: string) {
    return prisma.province.findUnique({
      where: { id }
    });
  }

  async findByCode(code: string) {
    return prisma.province.findUnique({
      where: { code }
    });
  }

  async searchByName(name: string) {
    return prisma.province.findMany({
      where: {
        OR: [
          { name: { contains: name, mode: 'insensitive' } },
          { altNames: { has: name } }
        ],
        isActive: true
      }
    });
  }
}

export class CityRepository {
  async findByProvinceId(provinceId: string, activeOnly = true) {
    return prisma.city.findMany({
      where: {
        provinceId,
        ...(activeOnly ? { isActive: true } : {})
      },
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: string) {
    return prisma.city.findUnique({
      where: { id },
      include: { province: true }
    });
  }

  async findByCode(code: string) {
    return prisma.city.findUnique({
      where: { code },
      include: { province: true }
    });
  }

  async searchByName(name: string, provinceId?: string) {
    return prisma.city.findMany({
      where: {
        OR: [
          { name: { contains: name, mode: 'insensitive' } },
          { altNames: { has: name } }
        ],
        isActive: true,
        ...(provinceId ? { provinceId } : {})
      },
      include: { province: true }
    });
  }
}

export class DistrictRepository {
  async findByCityId(cityId: string, activeOnly = true) {
    return prisma.district.findMany({
      where: {
        cityId,
        ...(activeOnly ? { isActive: true } : {})
      },
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: string) {
    return prisma.district.findUnique({
      where: { id },
      include: { city: { include: { province: true } } }
    });
  }

  async findByCode(code: string) {
    return prisma.district.findUnique({
      where: { code },
      include: { city: { include: { province: true } } }
    });
  }

  async searchByName(name: string, cityId?: string) {
    return prisma.district.findMany({
      where: {
        OR: [
          { name: { contains: name, mode: 'insensitive' } },
          { altNames: { has: name } }
        ],
        isActive: true,
        ...(cityId ? { cityId } : {})
      },
      include: { city: { include: { province: true } } }
    });
  }
}

export class VillageRepository {
  async findByDistrictId(districtId: string, activeOnly = true) {
    return prisma.village.findMany({
      where: {
        districtId,
        ...(activeOnly ? { isActive: true } : {})
      },
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: string) {
    return prisma.village.findUnique({
      where: { id },
      include: { district: { include: { city: { include: { province: true } } } } }
    });
  }

  async findByCode(code: string) {
    return prisma.village.findUnique({
      where: { code },
      include: { district: { include: { city: { include: { province: true } } } } }
    });
  }

  async findByPostalCode(postalCode: string) {
    return prisma.village.findMany({
      where: {
        postalCode,
        isActive: true
      },
      include: { district: { include: { city: { include: { province: true } } } } }
    });
  }

  async searchByName(name: string, districtId?: string) {
    return prisma.village.findMany({
      where: {
        OR: [
          { name: { contains: name, mode: 'insensitive' } },
          { altNames: { has: name } }
        ],
        isActive: true,
        ...(districtId ? { districtId } : {})
      },
      include: { district: { include: { city: { include: { province: true } } } } }
    });
  }
}

export class PostalCodeRepository {
  async findByPostalCode(postalCode: string) {
    return prisma.postalCode.findMany({
      where: { postalCode }
    });
  }

  async findByCity(cityName: string) {
    return prisma.postalCode.findMany({
      where: {
        cityName: { contains: cityName, mode: 'insensitive' }
      }
    });
  }

  async searchPostalCodes(query: string) {
    return prisma.postalCode.findMany({
      where: {
        OR: [
          { postalCode: { startsWith: query } },
          { villageName: { contains: query, mode: 'insensitive' } },
          { districtName: { contains: query, mode: 'insensitive' } },
          { cityName: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20
    });
  }
}
