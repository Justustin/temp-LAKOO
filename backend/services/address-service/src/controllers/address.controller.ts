import { Request, Response } from 'express';
import { AddressService } from '../services/address.service';
import { asyncHandler } from '../utils/asyncHandler';

export class AddressController {
  private service: AddressService;

  constructor() {
    this.service = new AddressService();
  }

  /**
   * Create a new address
   */
  createAddress = asyncHandler(async (req: Request, res: Response) => {
    const address = await this.service.createAddress(req.body);
    res.status(201).json({
      success: true,
      data: address
    });
  });

  /**
   * Get a single address by ID
   */
  getAddress = asyncHandler(async (req: Request, res: Response) => {
    const address = await this.service.getAddress(req.params.id);
    res.json({
      success: true,
      data: address
    });
  });

  /**
   * Get all addresses for a user
   */
  getUserAddresses = asyncHandler(async (req: Request, res: Response) => {
    const addresses = await this.service.getUserAddresses(req.params.userId);
    res.json({
      success: true,
      data: addresses
    });
  });

  /**
   * Get the default address for a user
   */
  getDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
    const address = await this.service.getDefaultAddress(req.params.userId);
    res.json({
      success: true,
      data: address
    });
  });

  /**
   * Update an address
   */
  updateAddress = asyncHandler(async (req: Request, res: Response) => {
    // Get userId from authenticated user context
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const address = await this.service.updateAddress(req.params.id, userId, req.body);
    res.json({
      success: true,
      data: address
    });
  });

  /**
   * Set an address as default
   */
  setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
    // Get userId from authenticated user context
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const address = await this.service.setDefaultAddress(req.params.id, userId);
    res.json({
      success: true,
      data: address
    });
  });

  /**
   * Delete an address (soft delete)
   */
  deleteAddress = asyncHandler(async (req: Request, res: Response) => {
    // Get userId from authenticated user context
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    await this.service.deleteAddress(req.params.id, userId);
    res.status(204).send();
  });

  /**
   * Mark an address as used (for order placement)
   */
  markAddressAsUsed = asyncHandler(async (req: Request, res: Response) => {
    const address = await this.service.markAddressAsUsed(req.params.id);
    res.json({
      success: true,
      data: address
    });
  });
}
