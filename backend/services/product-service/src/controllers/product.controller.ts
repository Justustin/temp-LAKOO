import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';


export class ProductController {
  private service: ProductService;

  constructor() {
    this.service = new ProductService();
  }

  createProduct = async (req: Request, res: Response) => {
    try {
        const product = await this.service.createProduct(req.body);
        res.status(201).json(product);
    } catch (error: any) {
        res.status(400).json({error: error.message})
    }
  }

  getProducts = async (req: Request, res: Response) => {
    try {
      const query = {
        factoryId: req.query.factoryId as string,
        categoryId: req.query.categoryId as string,
        status: req.query.status as any,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };
      const result = await this.service.getProducts(query);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getProductBySlug = async (req: Request, res: Response) => {
    try {
        const product = await this.service.getProductBySlug(req.params.slug);
        res.json(product)
    }catch (error: any){
        res.status(404).json({error: error.message})
    }
  }

  getProductById = async (req: Request, res: Response) => {
    try {
        const product = await this.service.getProductById(req.params.id);
        res.json(product)
    } catch (error: any){
        res.status(404).json({error: error.message})
    }
  }

  /**
   * Check if a product can be tagged in posts
   * Used by content-service for product tagging validation
   */
  checkTaggable = async (req: Request, res: Response) => {
    try {
      const product = await this.service.getProductById(req.params.id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Product is taggable if status is 'approved' or 'active' and not deleted
      const isTaggable = ['approved', 'active'].includes(product.status) && !product.deletedAt;

      res.json({
        success: true,
        data: {
          id: product.id,
          name: product.name,
          sellerId: product.sellerId || null,
          status: product.status,
          isTaggable,
          price: Number(product.baseSellPrice),
          primaryImageUrl: product.primaryImageUrl || null,
          productSource: product.sellerId ? 'seller_product' : 'warehouse_product'
        }
      });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * Batch check if multiple products can be tagged
   * More efficient than calling checkTaggable multiple times
   */
  batchCheckTaggable = async (req: Request, res: Response) => {
    try {
      const { productIds } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'productIds must be a non-empty array'
        });
      }

      // Limit batch size to prevent abuse
      if (productIds.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 50 products per batch'
        });
      }

      const results = await Promise.all(
        productIds.map(async (id: string) => {
          try {
            const product = await this.service.getProductById(id);
            if (!product) return null;

            const isTaggable = ['approved', 'active'].includes(product.status) && !product.deletedAt;

            return {
              id: product.id,
              name: product.name,
              sellerId: product.sellerId || null,
              status: product.status,
              isTaggable,
              price: Number(product.baseSellPrice),
              primaryImageUrl: product.primaryImageUrl || null,
              productSource: product.sellerId ? 'seller_product' : 'warehouse_product'
            };
          } catch {
            return null;
          }
        })
      );

      res.json({
        success: true,
        data: results.filter(r => r !== null)
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  getVariantById = async (req: Request, res: Response) => {
    try {
      const variant = await this.service.getVariantById(req.params.variantId);
      res.json({ success: true, data: variant });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  };

  updateProduct = async (req: Request, res: Response) => {
    try {
        const product = await this.service.updateProduct(req.params.id, req.body);
        res.json(product)
    } catch (error: any) {
        res.status(400).json({error: error.message})
    }
  }
  publishProduct = async (req: Request, res: Response) => {
    try {
      const product = await this.service.publishProduct(req.params.id);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  deleteProduct = async (req: Request, res: Response) => {
    try {
      await this.service.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  addImages = async (req: Request, res: Response) => {
    try {
      await this.service.addProductImages(req.params.id, req.body.images);
      res.status(201).json({ message: 'Images added successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  createVariant = async (req: Request, res: Response) => {
    try {
      const variant = await this.service.createVariant(req.body);
      res.status(201).json(variant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============= Grosir Config Management (Simplified) =============

  /**
   * Set bundle composition - defines units per bundle for each variant
   */
  setBundleComposition = async (req: Request, res: Response) => {
    try {
      const { compositions } = req.body;

      if (!compositions || !Array.isArray(compositions) || compositions.length === 0) {
        return res.status(400).json({ error: 'Compositions array is required' });
      }

      const result = await this.service.setBundleComposition(req.params.id, compositions);
      res.json({
        success: true,
        message: 'Bundle composition set successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Set warehouse inventory configuration - max stock and reorder thresholds
   */
  setWarehouseInventoryConfig = async (req: Request, res: Response) => {
    try {
      const { configs } = req.body;

      if (!configs || !Array.isArray(configs) || configs.length === 0) {
        return res.status(400).json({ error: 'Configs array is required' });
      }

      const result = await this.service.setWarehouseInventoryConfig(req.params.id, configs);
      res.json({
        success: true,
        message: 'Warehouse inventory configuration set successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get grosir configuration
   */
  getGrosirConfig = async (req: Request, res: Response) => {
    try {
      const config = await this.service.getGrosirConfig(req.params.id);
      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  };
}