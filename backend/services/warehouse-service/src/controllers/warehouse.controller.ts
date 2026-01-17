import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { WarehouseService } from '../services/warehouse.service';

export class WarehouseController {
    private service: WarehouseService;

    constructor() {
        this.service = new WarehouseService();
    }

    fulfillDemand = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const result = await this.service.fulfillDemand(req.body);
            res.status(200).json({ success: true, ...result });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    fulfillBundleDemand = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const result = await this.service.fulfillBundleDemand(req.body);
            res.status(200).json({ success: true, ...result });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    getInventoryStatus = async (req: Request, res: Response) => {
        try {
            const { productId, variantId } = req.query;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    error: 'productId is required'
                });
            }

            const result = await this.service.getInventoryStatus(
                productId as string,
                (variantId as string) || null
            );

            res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    checkBundleOverflow = async (req: Request, res: Response) => {
        try {
            const { productId, variantId } = req.query;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    error: 'productId is required'
                });
            }

            const result = await this.service.checkBundleOverflow(
                productId as string,
                (variantId as string) || null
            );

            res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    checkAllVariantsOverflow = async (req: Request, res: Response) => {
        try {
            const { productId } = req.query;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    error: 'productId is required'
                });
            }

            const result = await this.service.checkAllVariantsOverflow(
                productId as string
            );

            res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    reserveInventory = async (req: Request, res: Response) => {
        try {
            const { productId, variantId, quantity } = req.body;

            if (!productId || !quantity) {
                return res.status(400).json({
                    success: false,
                    error: 'productId and quantity are required'
                });
            }

            const result = await this.service.reserveInventory(
                productId,
                variantId || null,
                quantity
            );

            res.status(200).json({ success: true, ...result });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
}