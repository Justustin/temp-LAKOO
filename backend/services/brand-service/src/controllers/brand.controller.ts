import { Request, Response } from 'express';
import { BrandService } from '../services/brand.service';
import { BrandQuery, BrandProductQuery } from '../types';

export class BrandController {
  private service: BrandService;

  constructor() {
    this.service = new BrandService();
  }

  // ==================== Brand Endpoints ====================

  createBrand = async (req: Request, res: Response) => {
    try {
      const brand = await this.service.createBrand(req.body);
      res.status(201).json({
        success: true,
        data: brand
      });
    } catch (error: any) {
      const status = error.message.includes('already exists') ? 409 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  getBrands = async (req: Request, res: Response) => {
    try {
      const query: BrandQuery = {
        status: req.query.status as any,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      };

      const result = await this.service.getBrands(query);
      res.json({
        success: true,
        data: result.brands,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getBrandById = async (req: Request, res: Response) => {
    try {
      const brand = await this.service.getBrandById(req.params.id);
      res.json({
        success: true,
        data: brand
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  getBrandBySlug = async (req: Request, res: Response) => {
    try {
      const brand = await this.service.getBrandBySlug(req.params.slug);
      res.json({
        success: true,
        data: brand
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  updateBrand = async (req: Request, res: Response) => {
    try {
      const brand = await this.service.updateBrand(req.params.id, req.body);
      res.json({
        success: true,
        data: brand
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  deleteBrand = async (req: Request, res: Response) => {
    try {
      await this.service.deleteBrand(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  // ==================== Brand Product Endpoints ====================

  addProductToBrand = async (req: Request, res: Response) => {
    try {
      const brandProduct = await this.service.addProductToBrand(req.params.brandId, req.body);
      res.status(201).json({
        success: true,
        data: brandProduct
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 :
                     error.message.includes('already exists') ? 409 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  getBrandProducts = async (req: Request, res: Response) => {
    try {
      const query: BrandProductQuery = {
        isFeatured: req.query.isFeatured === 'true' ? true :
                    req.query.isFeatured === 'false' ? false : undefined,
        isBestseller: req.query.isBestseller === 'true' ? true :
                      req.query.isBestseller === 'false' ? false : undefined,
        isNewArrival: req.query.isNewArrival === 'true' ? true :
                      req.query.isNewArrival === 'false' ? false : undefined,
        isActive: req.query.isActive === 'true' ? true :
                  req.query.isActive === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      };

      const result = await this.service.getBrandProducts(req.params.brandId, query);
      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  getBrandProduct = async (req: Request, res: Response) => {
    try {
      const brandProduct = await this.service.getBrandProduct(
        req.params.brandId,
        req.params.productId
      );
      res.json({
        success: true,
        data: brandProduct
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  updateBrandProduct = async (req: Request, res: Response) => {
    try {
      const brandProduct = await this.service.updateBrandProduct(
        req.params.brandId,
        req.params.productId,
        req.body
      );
      res.json({
        success: true,
        data: brandProduct
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  removeProductFromBrand = async (req: Request, res: Response) => {
    try {
      await this.service.removeProductFromBrand(req.params.brandId, req.params.productId);
      res.status(204).send();
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  getFeaturedProducts = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const products = await this.service.getFeaturedProducts(req.params.brandId, limit);
      res.json({
        success: true,
        data: products
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  getBestsellers = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const products = await this.service.getBestsellers(req.params.brandId, limit);
      res.json({
        success: true,
        data: products
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };

  getNewArrivals = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const products = await this.service.getNewArrivals(req.params.brandId, limit);
      res.json({
        success: true,
        data: products
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  };
}