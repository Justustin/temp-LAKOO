import { prisma } from '@repo/database';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { FulfillDemandDTO, FulfillBundleDemandDTO } from '../types';
import axios from 'axios';

const FACTORY_SERVICE_URL = process.env.FACTORY_SERVICE_URL || 'http://localhost:3003';
const LOGISTICS_SERVICE_URL = process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008';
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3012';
const WAREHOUSE_POSTAL_CODE = process.env.WAREHOUSE_POSTAL_CODE || '13910';
const WAREHOUSE_ADDRESS = process.env.WAREHOUSE_ADDRESS || 'Laku Warehouse Address';

export class WarehouseService {
    private repository: WarehouseRepository;

    constructor() {
        this.repository = new WarehouseRepository();
    }

    /**
     * Main logic to handle demand from a completed group buy session.
     */
    async fulfillDemand(data: FulfillDemandDTO) {
        const { productId, variantId, quantity, wholesaleUnit } = data;

        // 1. Check current inventory
        const inventory = await this.repository.findInventory(productId, variantId || null);
        const currentStock = inventory?.available_quantity || 0;

        console.log(`Demand for product ${productId}: ${quantity}. Current stock: ${currentStock}.`);

        if (currentStock >= quantity) {
            console.log("Sufficient stock in warehouse. No purchase order needed.");

            // CRITICAL FIX: Actually reserve the stock to prevent overselling
            if (!inventory) {
                throw new Error('Inventory record not found');
            }

            await prisma.warehouse_inventory.update({
                where: { id: inventory.id },
                data: {
                    available_quantity: { decrement: quantity },
                    reserved_quantity: { increment: quantity }
                }
            });

            console.log(`Reserved ${quantity} units from warehouse inventory`);
            return {
                message: "Demand fulfilled from existing stock.",
                hasStock: true,
                reserved: quantity,
                inventoryId: inventory.id
            };
        }

        // 2. If insufficient, calculate how much to order from the factory
        const needed = quantity - currentStock;

        // ✅ Round up to the nearest wholesale_unit
        const factoryOrderQuantity = Math.ceil(needed / wholesaleUnit) * wholesaleUnit;

        console.log(`Insufficient stock. Need ${needed}, ordering ${factoryOrderQuantity} from factory.`);

        // 3. Get product and factory details to create the purchase order
        const product = await prisma.products.findUnique({
            where: { id: productId },
            include: { factories: true }
        });
        if (!product || !product.factories) {
            throw new Error(`Product or factory not found for productId: ${productId}`);
        }

        const factory = product.factories;

        // 4. Calculate Leg 1 (Factory -> Warehouse) shipping cost for the PO
        const shippingCost = await this._calculateBulkShipping(factory, product, factoryOrderQuantity);

        // 5. Create the Warehouse Purchase Order
        const unitCost = Number(product.cost_price || product.base_price);
        const totalCost = (unitCost * factoryOrderQuantity) + shippingCost;

        const purchaseOrder = await this.repository.createPurchaseOrder({
            factoryId: factory.id,
            productId,
            variantId,
            quantity: factoryOrderQuantity,
            unitCost,
            shippingCost,
            totalCost
        });

        console.log(`Created Purchase Order ${purchaseOrder.po_number} for ${factoryOrderQuantity} units.`);

        // 6. NEW: Send WhatsApp to factory about purchase order
        await this._sendWhatsAppToFactory(factory, product, purchaseOrder, factoryOrderQuantity);

        return {
            message: "Insufficient stock. Purchase order created and factory notified.",
            hasStock: false,
            purchaseOrder,
            grosirUnitsNeeded: Math.ceil(factoryOrderQuantity / wholesaleUnit)
        };
    }

    /**
     * Fulfill demand using simplified grosir bundle composition
     * Uses warehouse inventory max_stock_level and reorder_threshold
     */
    async fulfillBundleDemand(data: FulfillBundleDemandDTO) {
        const { productId, variantId, quantity } = data;

        console.log(`Bundle demand for product ${productId}, variant ${variantId}: ${quantity} units`);

        // 1. Get bundle composition for this variant
        const bundleComposition = await prisma.grosir_bundle_composition.findUnique({
            where: {
                product_id_variant_id: {
                    product_id: productId,
                    variant_id: variantId || "null"
                }
            }
        });

        if (!bundleComposition) {
            throw new Error(
                `Bundle composition not found for product ${productId}, variant ${variantId}. ` +
                `Please configure grosir_bundle_composition table.`
            );
        }

        const unitsPerBundle = bundleComposition.units_in_bundle;
        console.log(`Bundle composition: ${unitsPerBundle} units per bundle`);

        // 2. Check current inventory
        const inventory = await this.repository.findInventory(productId, variantId || null);
        const currentStock = inventory?.quantity || 0;
        const reservedStock = inventory?.reserved_quantity || 0;
        const availableStock = currentStock - reservedStock;

        console.log(`Current inventory: ${currentStock} total, ${reservedStock} reserved, ${availableStock} available`);

        // 3. If sufficient stock, reserve it
        if (availableStock >= quantity) {
            console.log(`Sufficient stock available`);

            if (!inventory) {
                throw new Error('Inventory record not found');
            }

            await prisma.warehouse_inventory.update({
                where: { id: inventory.id },
                data: {
                    reserved_quantity: { increment: quantity }
                }
            });

            console.log(`Reserved ${quantity} units from warehouse`);

            return {
                message: "Demand fulfilled from existing stock.",
                hasStock: true,
                reserved: quantity,
                inventoryId: inventory.id
            };
        }

        // 4. Insufficient stock - calculate how many bundles to order
        const shortage = quantity - availableStock;
        const bundlesToOrder = Math.ceil(shortage / unitsPerBundle);
        const unitsToOrder = bundlesToOrder * unitsPerBundle;

        console.log(`Insufficient stock. Shortage: ${shortage}, ordering ${bundlesToOrder} bundles (${unitsToOrder} units)`);

        // 5. Get product and factory details
        const product = await prisma.products.findUnique({
            where: { id: productId },
            include: { factories: true }
        });

        if (!product || !product.factories) {
            throw new Error(`Product or factory not found for productId: ${productId}`);
        }

        const factory = product.factories;

        // 6. Calculate shipping cost for the PO
        const shippingCost = await this._calculateBulkShipping(factory, product, unitsToOrder);

        // 7. Create purchase order
        const unitCost = Number(product.cost_price || product.base_price);
        const totalCost = (unitCost * unitsToOrder) + shippingCost;

        const purchaseOrder = await this.repository.createPurchaseOrder({
            factoryId: factory.id,
            productId,
            variantId: variantId || undefined,
            quantity: unitsToOrder,
            unitCost,
            shippingCost,
            totalCost
        });

        console.log(`Created PO ${purchaseOrder.po_number} for ${bundlesToOrder} bundles (${unitsToOrder} units)`);

        // 8. Send WhatsApp notification to factory
        await this._sendWhatsAppToFactory(factory, product, purchaseOrder, unitsToOrder, bundlesToOrder);

        return {
            message: "Insufficient stock. Purchase order created for bundles.",
            hasStock: false,
            purchaseOrder,
            bundlesToOrder,
            unitsToOrder,
            unitsPerBundle
        };
    }

    /**
     * Get inventory status for a product/variant
     */
    async getInventoryStatus(productId: string, variantId: string | null) {
        const inventory = await this.repository.findInventory(productId, variantId);

        if (!inventory) {
            return {
                status: 'not_configured',
                quantity: 0,
                availableQuantity: 0,
                reservedQuantity: 0,
                maxStockLevel: 0,
                reorderThreshold: 0
            };
        }

        const available = inventory.quantity - (inventory.reserved_quantity || 0);
        let status = 'in_stock';

        if (available <= 0) {
            status = 'out_of_stock';
        } else if (inventory.reorder_threshold !== null && inventory.quantity <= inventory.reorder_threshold) {
            status = 'low_stock';
        }

        return {
            productId,
            variantId,
            quantity: inventory.quantity,
            reservedQuantity: inventory.reserved_quantity || 0,
            availableQuantity: available,
            maxStockLevel: inventory.max_stock_level || 0,
            reorderThreshold: inventory.reorder_threshold || 0,
            status
        };
    }

    /**
     * Check if ordering a bundle for requested variant would overflow other variants
     *
     * Logic: If warehouse needs to order a bundle from factory, check if adding
     * that bundle would exceed max_stock_level for ANY variant in the bundle.
     *
     * Example:
     *   Bundle: 4S + 4M + 4L
     *   Max: 8S, 8M, 8L
     *   Current: 8S, 0M, 8L
     *   User wants M → Would order bundle → After: 12S, 4M, 12L
     *   Check: 12S > 8? YES → M is LOCKED
     */
    async checkBundleOverflow(productId: string, variantId: string | null) {
        // 1. Get bundle composition for the product
        const bundleCompositions = await prisma.grosir_bundle_composition.findMany({
            where: { product_id: productId }
        });

        if (bundleCompositions.length === 0) {
            return {
                isLocked: false,
                reason: 'Product not configured for bundle checking',
                canOrder: true
            };
        }

        // 2. Get current inventory for all variants
        const inventories = await prisma.warehouse_inventory.findMany({
            where: { product_id: productId }
        });

        // 3. Check if requested variant has stock (if yes, no bundle needed)
        const requestedInventory = inventories.find(
            inv => (inv.variant_id || null) === (variantId || null)
        );

        if (requestedInventory) {
            const available = requestedInventory.quantity - (requestedInventory.reserved_quantity || 0);
            if (available > 0) {
                // Has stock, no bundle needed, not locked
                return {
                    isLocked: false,
                    reason: 'Stock available - no bundle order needed',
                    canOrder: true,
                    availableQuantity: available
                };
            }
        }

        // 4. No stock - check if ordering a bundle would overflow any variant
        const overflowVariants: string[] = [];

        for (const bundleComp of bundleCompositions) {
            const inventory = inventories.find(
                inv => (inv.variant_id || null) === (bundleComp.variant_id || null)
            );

            if (!inventory) continue;

            const currentQuantity = inventory.quantity || 0;
            const maxStock = inventory.max_stock_level || 0;
            const bundleUnits = bundleComp.units_in_bundle;

            // After ordering bundle, would this variant exceed max?
            const afterBundle = currentQuantity + bundleUnits;

            if (afterBundle > maxStock && maxStock > 0) {
                const variantName = bundleComp.variant_id || 'base';
                overflowVariants.push(
                    `${variantName} (${currentQuantity} + ${bundleUnits} = ${afterBundle} > ${maxStock})`
                );
            }
        }

        // 5. If any variant would overflow, lock the requested variant
        if (overflowVariants.length > 0) {
            return {
                isLocked: true,
                reason: `Ordering a bundle would exceed max stock for: ${overflowVariants.join(', ')}`,
                canOrder: false,
                overflowVariants
            };
        }

        // 6. No overflow - can order
        return {
            isLocked: false,
            reason: 'Bundle can be ordered without overflow',
            canOrder: true
        };
    }

    /**
     * Check overflow status for ALL variants of a product (for frontend display)
     * Returns lock status for each variant so UI can gray out locked options
     *
     * Frontend Usage:
     *   GET /api/warehouse/check-all-variants?productId=X
     *   → Display white buttons for unlocked variants
     *   → Display gray (disabled) buttons for locked variants with tooltip
     */
    async checkAllVariantsOverflow(productId: string) {
        // 1. Get bundle composition for the product
        const bundleCompositions = await prisma.grosir_bundle_composition.findMany({
            where: { product_id: productId },
            include: {
                product_variants: {
                    select: {
                        id: true,
                        variant_name: true,
                        sku: true
                    }
                }
            }
        });

        if (bundleCompositions.length === 0) {
            return {
                productId,
                variants: [],
                message: 'Product not configured for bundle checking'
            };
        }

        // 2. Get current inventory for all variants
        const inventories = await prisma.warehouse_inventory.findMany({
            where: { product_id: productId }
        });

        // 3. Check each variant
        const variantStatuses: Array<{
            variantId: string | null;
            variantName: string;
            isLocked: boolean;
            canOrder: boolean;
            reason: string;
            availableQuantity: number;
            overflowVariants?: string[];
        }> = [];

        for (const bundleComp of bundleCompositions) {
            const variantId = bundleComp.variant_id;

            // Check if this variant has stock
            const inventory = inventories.find(
                inv => (inv.variant_id || null) === (variantId || null)
            );

            const available = inventory
                ? (inventory.quantity || 0) - (inventory.reserved_quantity || 0)
                : 0;

            // If has stock, not locked
            if (available > 0) {
                variantStatuses.push({
                    variantId,
                    variantName: bundleComp.product_variants?.variant_name || 'Base Product',
                    isLocked: false,
                    canOrder: true,
                    reason: `Stock available (${available} units)`,
                    availableQuantity: available
                });
                continue;
            }

            // No stock - check if ordering bundle would overflow other variants
            const overflowVariants: string[] = [];

            for (const otherBundleComp of bundleCompositions) {
                const otherInventory = inventories.find(
                    inv => (inv.variant_id || null) === (otherBundleComp.variant_id || null)
                );

                if (!otherInventory) continue;

                const currentQuantity = otherInventory.quantity || 0;
                const maxStock = otherInventory.max_stock_level || 0;
                const bundleUnits = otherBundleComp.units_in_bundle;
                const afterBundle = currentQuantity + bundleUnits;

                if (afterBundle > maxStock && maxStock > 0) {
                    const otherVariantName = otherBundleComp.product_variants?.variant_name || 'base';
                    overflowVariants.push(otherVariantName);
                }
            }

            // Add status for this variant
            variantStatuses.push({
                variantId,
                variantName: bundleComp.product_variants?.variant_name || 'Base Product',
                isLocked: overflowVariants.length > 0,
                canOrder: overflowVariants.length === 0,
                reason: overflowVariants.length > 0
                    ? `Would overflow: ${overflowVariants.join(', ')}`
                    : 'Can order (bundle has room)',
                availableQuantity: 0,
                overflowVariants: overflowVariants.length > 0 ? overflowVariants : undefined
            });
        }

        return {
            productId,
            variants: variantStatuses
        };
    }

    private async _calculateBulkShipping(factory: any, product: any, quantity: number): Promise<number> {
        try {
            const payload = {
                originPostalCode: factory.postal_code,
                destinationPostalCode: WAREHOUSE_POSTAL_CODE,
                items: [{
                    name: product.name,
                    value: Number(product.cost_price || product.base_price) * quantity,
                    weight: (product.weight_grams || 500) * quantity,
                    quantity: 1
                }]
            };
            const response = await axios.post(`${LOGISTICS_SERVICE_URL}/api/rates`, payload);
            const rates = response.data.data?.pricing || [];
            if (rates.length === 0) return 50000; // Default fallback
            return rates[0].price;
        } catch (error) {
            console.error("Failed to calculate bulk shipping for PO:", error);
            return 50000; // Return a default fallback on error
        }
    }

        async reserveInventory(productId: string, variantId: string | null, quantity: number) {
        console.log(`Reserve inventory request: product ${productId}, variant ${variantId}, quantity ${quantity}`);

        // Check current inventory
        const inventory = await this.repository.findInventory(productId, variantId);

        if (!inventory) {
            return {
                message: 'Inventory not configured for this product/variant',
                reserved: false
            };
        }

        const currentStock = inventory.quantity || 0;
        const reservedStock = inventory.reserved_quantity || 0;
        const availableStock = currentStock - reservedStock;

        console.log(`Current inventory: ${currentStock} total, ${reservedStock} reserved, ${availableStock} available`);

        // If sufficient stock, reserve it
        if (availableStock >= quantity) {
            await prisma.warehouse_inventory.update({
                where: { id: inventory.id },
                data: {
                    reserved_quantity: { increment: quantity }
                }
            });

            console.log(`✓ Reserved ${quantity} units (${availableStock - quantity} remaining)`);

            return {
                message: `Successfully reserved ${quantity} units`,
                reserved: true,
                quantity,
                availableAfter: availableStock - quantity
            };
        }

        // Insufficient stock - don't create purchase order here
        // Will be handled at session expiration
        console.log(`⚠ Insufficient stock to reserve (need ${quantity}, have ${availableStock})`);

        return {
            message: `Insufficient stock to reserve (need ${quantity}, have ${availableStock})`,
            reserved: false,
            shortage: quantity - availableStock
        };
    }


    /**
     * NEW: Send WhatsApp message to factory about purchase order
     */
    private async _sendWhatsAppToFactory(factory: any, product: any, purchaseOrder: any, quantity: number, bundles?: number) {
        if (!factory.phone_number) {
            console.warn(`Factory ${factory.factory_name} has no phone number. Skipping WhatsApp notification.`);
            return;
        }

        const bundleInfo = bundles ? `\n*Bundles:* ${bundles} bundles` : '';

        const message = `
🏭 *New Purchase Order - ${factory.factory_name}*

*PO Number:* ${purchaseOrder.po_number}
*Product:* ${product.name}
*Quantity:* ${quantity} units${bundleInfo}
*Total Value:* Rp ${purchaseOrder.total_cost.toLocaleString('id-ID')}

Please prepare and send to Laku Warehouse.

*Delivery Address:*
${WAREHOUSE_ADDRESS}

Thank you!
        `.trim();

        try {
            await axios.post(
                `${WHATSAPP_SERVICE_URL}/api/whatsapp/send`,
                {
                    phoneNumber: factory.phone_number,
                    message
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            console.log(`WhatsApp sent to factory ${factory.factory_name} (${factory.phone_number})`);
        } catch (error: any) {
            console.error(`Failed to send WhatsApp to factory ${factory.factory_name}:`, error.message);
            // Don't throw - we still want to continue even if WhatsApp fails
        }
    }
}