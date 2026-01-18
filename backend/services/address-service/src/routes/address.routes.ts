import { Router, type Router as ExpressRouter } from 'express';
import { AddressController } from '../controllers/address.controller';
import { gatewayOrInternalAuth, internalOnly } from '../middleware/auth';
import {
  validateRequest,
  createAddressValidators,
  updateAddressValidators,
  idParamValidator,
  userIdParamValidator,
  setDefaultValidators,
  deleteAddressValidators
} from '../middleware/validation';

const router: ExpressRouter = Router();
const controller = new AddressController();

// All routes require authentication
router.use(gatewayOrInternalAuth);

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Create a new address
 *     tags: [Addresses]
 *     security:
 *       - gatewayAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAddress'
 *     responses:
 *       201:
 *         description: Address created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createAddressValidators, validateRequest, controller.createAddress);

/**
 * @swagger
 * /api/addresses/user/{userId}:
 *   get:
 *     summary: Get all addresses for a user
 *     tags: [Addresses]
 *     security:
 *       - gatewayAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of addresses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Address'
 *       400:
 *         description: Bad request
 */
router.get('/user/:userId', userIdParamValidator, validateRequest, controller.getUserAddresses);

/**
 * @swagger
 * /api/addresses/user/{userId}/default:
 *   get:
 *     summary: Get default address for a user (used by order-service)
 *     tags: [Addresses]
 *     security:
 *       - gatewayAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: Default address
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *       404:
 *         description: No default address found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user/:userId/default', userIdParamValidator, validateRequest, controller.getDefaultAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   get:
 *     summary: Get a single address by ID
 *     tags: [Addresses]
 *     security:
 *       - gatewayAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *       404:
 *         description: Address not found
 */
router.get('/:id', idParamValidator, validateRequest, controller.getAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   patch:
 *     summary: Update an address
 *     tags: [Addresses]
 *     security:
 *       - gatewayAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAddress'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Address not found
 */
router.patch('/:id', updateAddressValidators, validateRequest, controller.updateAddress);

/**
 * @swagger
 * /api/addresses/{id}/set-default:
 *   post:
 *     summary: Set an address as default
 *     tags: [Addresses]
 *     security:
 *       - gatewayAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address set as default
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Address not found
 */
router.post('/:id/set-default', setDefaultValidators, validateRequest, controller.setDefaultAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete an address (soft delete)
 *     tags: [Addresses]
 *     security:
 *       - gatewayAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Address ID
 *     responses:
 *       204:
 *         description: Address deleted successfully
 *       400:
 *         description: Bad request (e.g., cannot delete only address)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Address not found
 */
router.delete('/:id', deleteAddressValidators, validateRequest, controller.deleteAddress);

/**
 * @swagger
 * /api/addresses/{id}/mark-used:
 *   post:
 *     summary: Mark an address as used (internal only - for order placement)
 *     tags: [Addresses]
 *     description: Internal endpoint for order-service to track address usage
 *     security:
 *       - internalAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address marked as used
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *       403:
 *         description: Forbidden - internal access only
 *       404:
 *         description: Address not found
 */
router.post('/:id/mark-used', internalOnly, idParamValidator, validateRequest, controller.markAddressAsUsed);

export default router;
