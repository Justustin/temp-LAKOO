import { Response } from 'express';
import { BrandService } from '../services/brand.service';
import { BrandQuery, BrandProductQuery } from '../types';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';

const service = new BrandService();

export class BrandController {
  // ==================== Brand Endpoints ====================

  createBrand = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const brand = await service.createBrand(req.body);
    res.status(201).json({
      success: true,
      data: brand
    });
  });

  getBrands = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query: BrandQuery = {
      status: req.query.status as any,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const result = await service.getBrands(query);
    res.json({
      success: true,
      data: result.brands,
      pagination: result.pagination
    });
  });

  getBrandById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const brand = await service.getBrandById(req.params.id!);
    res.json({
      success: true,
      data: brand
    });
  });

  getBrandBySlug = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const brand = await service.getBrandBySlug(req.params.slug!);
    res.json({
      success: true,
      data: brand
    });
  });

  updateBrand = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const brand = await service.updateBrand(req.params.id!, req.body);
    res.json({
      success: true,
      data: brand
    });
  });

  deleteBrand = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await service.deleteBrand(req.params.id!);
    res.status(204).send();
  });

  // ==================== Brand Product Endpoints ====================

  addProductToBrand = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const brandProduct = await service.addProductToBrand(req.params.brandId!, req.body);
    res.status(201).json({
      success: true,
      data: brandProduct
    });
  });

  getBrandProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

    const result = await service.getBrandProducts(req.params.brandId!, query);
    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  });

  getBrandProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const brandProduct = await service.getBrandProduct(
      req.params.brandId!,
      req.params.productId!
    );
    res.json({
      success: true,
      data: brandProduct
    });
  });

  updateBrandProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const brandProduct = await service.updateBrandProduct(
      req.params.brandId!,
      req.params.productId!,
      req.body
    );
    res.json({
      success: true,
      data: brandProduct
    });
  });

  removeProductFromBrand = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await service.removeProductFromBrand(req.params.brandId!, req.params.productId!);
    res.status(204).send();
  });

  getFeaturedProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const products = await service.getFeaturedProducts(req.params.brandId!, limit);
    res.json({
      success: true,
      data: products
    });
  });

  getBestsellers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const products = await service.getBestsellers(req.params.brandId!, limit);
    res.json({
      success: true,
      data: products
    });
  });

  getNewArrivals = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const products = await service.getNewArrivals(req.params.brandId!, limit);
    res.json({
      success: true,
      data: products
    });
  });
}
