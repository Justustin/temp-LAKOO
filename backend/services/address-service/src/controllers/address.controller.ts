import { Request, Response } from 'express';
import { AddressService, ForbiddenError } from '../services/address.service';
import { asyncHandler } from '../utils/asyncHandler';

export class AddressController {
  private service: AddressService;

  constructor() {
    this.service = new AddressService();
  }

  /**
   * Create a new address - uses authenticated user's ID
   */
  createAddress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Override any userId in body with authenticated user's ID
    const addressData = {
      ...req.body,
      userId
    };

    const address = await this.service.createAddress(addressData);
    res.status(201).json({
      success: true,
      data: address
    });
  });

  /**
   * Get a single address by ID - verifies ownership
   */
  getAddress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const isInternal = req.user!.role === 'internal';

    const address = await this.service.getAddress(req.params.id);

    // Verify ownership (unless internal service)
    if (!isInternal && address.userId !== userId) {
      throw new ForbiddenError('Not authorized to access this address');
    }

    res.json({
      success: true,
      data: address
    });
  });

  /**
   * Get all addresses for a user - verifies ownership or internal access
   */
  getUserAddresses = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const isInternal = req.user!.role === 'internal';
    const requestedUserId = req.params.userId;

    // Users can only access their own addresses (unless internal service)
    if (!isInternal && requestedUserId !== userId) {
      throw new ForbiddenError('Not authorized to access these addresses');
    }

    const addresses = await this.service.getUserAddresses(requestedUserId);
    res.json({
      success: true,
      data: addresses
    });
  });

  /**
   * Get the default address for a user - verifies ownership or internal access
   */
  getDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const isInternal = req.user!.role === 'internal';
    const requestedUserId = req.params.userId;

    // Users can only access their own default address (unless internal service)
    if (!isInternal && requestedUserId !== userId) {
      throw new ForbiddenError('Not authorized to access this address');
    }

    const address = await this.service.getDefaultAddress(requestedUserId);
    res.json({
      success: true,
      data: address
    });
  });

  /**
   * Update an address - ownership verified in service layer
   */
  updateAddress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const address = await this.service.updateAddress(req.params.id, userId, req.body);
    res.json({
      success: true,
      data: address
    });
  });

  /**
   * Set an address as default - ownership verified in service layer
   */
  setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const address = await this.service.setDefaultAddress(req.params.id, userId);
    res.json({
      success: true,
      data: address
    });
  });

  /**
   * Delete an address (soft delete) - ownership verified in service layer
   */
  deleteAddress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await this.service.deleteAddress(req.params.id, userId);
    res.status(204).send();
  });

  /**
   * Mark an address as used (internal only - for order placement)
   * Route-level middleware ensures only internal services can call this
   */
  markAddressAsUsed = asyncHandler(async (req: Request, res: Response) => {
    const address = await this.service.markAddressAsUsed(req.params.id);
    res.json({
      success: true,
      data: address
    });
  });
}
