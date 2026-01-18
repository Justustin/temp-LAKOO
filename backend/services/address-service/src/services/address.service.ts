import { AddressRepository } from '../repositories/address.repository';
import { CreateAddressDTO, UpdateAddressDTO } from '../types';
import { outboxService } from './outbox.service';

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class AddressService {
  private repository: AddressRepository;

  constructor() {
    this.repository = new AddressRepository();
  }

  /**
   * Create a new address for a user
   */
  async createAddress(data: CreateAddressDTO) {
    const address = await this.repository.create(data);

    // Publish domain event
    await outboxService.addressCreated(address);

    return address;
  }

  /**
   * Get a single address by ID
   */
  async getAddress(id: string) {
    const address = await this.repository.findById(id);
    if (!address) {
      throw new NotFoundError('Address not found');
    }
    return address;
  }

  /**
   * Get all addresses for a user
   */
  async getUserAddresses(userId: string) {
    return this.repository.findByUserId(userId);
  }

  /**
   * Get the default address for a user
   */
  async getDefaultAddress(userId: string) {
    const address = await this.repository.findDefaultByUserId(userId);
    if (!address) {
      throw new NotFoundError('No default address found');
    }
    return address;
  }

  /**
   * Update an address
   */
  async updateAddress(id: string, userId: string, data: UpdateAddressDTO) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Address not found');
    }

    // Verify ownership
    if (existing.userId !== userId) {
      throw new UnauthorizedError('Not authorized to update this address');
    }

    // If setting as default, handle the switch
    if (data.isDefault) {
      await this.repository.setAsDefault(id, existing.userId);
      // Remove isDefault from update data since we handled it
      const { isDefault, ...updateData } = data;
      if (Object.keys(updateData).length > 0) {
        const updated = await this.repository.update(id, updateData);
        await outboxService.addressUpdated(updated);
        return updated;
      }
      const updated = await this.repository.findById(id);
      if (updated) {
        await outboxService.addressUpdated(updated);
      }
      return updated;
    }

    const updated = await this.repository.update(id, data);
    await outboxService.addressUpdated(updated);
    return updated;
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(id: string, userId: string) {
    const address = await this.repository.findById(id);
    if (!address) {
      throw new NotFoundError('Address not found');
    }

    if (address.userId !== userId) {
      throw new UnauthorizedError('Not authorized to modify this address');
    }

    const updated = await this.repository.setAsDefault(id, userId);
    await outboxService.addressUpdated(updated);
    return updated;
  }

  /**
   * Delete an address (soft delete)
   */
  async deleteAddress(id: string, userId: string) {
    const address = await this.repository.findById(id);
    if (!address) {
      throw new NotFoundError('Address not found');
    }

    if (address.userId !== userId) {
      throw new UnauthorizedError('Not authorized to delete this address');
    }

    // Count user's addresses
    const addressCount = await this.repository.countByUserId(userId);

    // Prevent deleting the last address
    if (addressCount === 1) {
      throw new BadRequestError('Cannot delete the only address');
    }

    // If deleting default address, set another one as default
    if (address.isDefault) {
      const allAddresses = await this.repository.findByUserId(userId);
      const otherAddress = allAddresses.find(a => a.id !== id);
      if (otherAddress) {
        await this.repository.setAsDefault(otherAddress.id, userId);
      }
    }

    const deleted = await this.repository.softDelete(id);
    await outboxService.addressDeleted(deleted);
    return deleted;
  }

  /**
   * Mark an address as used (for order placement)
   */
  async markAddressAsUsed(id: string) {
    const address = await this.repository.findById(id);
    if (!address) {
      throw new NotFoundError('Address not found');
    }

    return this.repository.markAsUsed(id);
  }

  /**
   * Validate address ownership
   */
  async validateOwnership(id: string, userId: string): Promise<boolean> {
    const address = await this.repository.findById(id);
    if (!address) {
      return false;
    }
    return address.userId === userId;
  }
}
