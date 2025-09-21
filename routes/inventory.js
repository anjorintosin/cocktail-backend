const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const Cocktail = require('../models/Cocktail');
const inventoryAlertService = require('../services/inventoryAlertService');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Inventory:
 *       type: object
 *       required:
 *         - cocktail
 *         - currentStock
 *         - minimumStock
 *         - maximumStock
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the inventory item
 *         cocktail:
 *           type: string
 *           description: Cocktail ID reference
 *         currentStock:
 *           type: number
 *           minimum: 0
 *           description: Current stock level
 *         minimumStock:
 *           type: number
 *           minimum: 0
 *           description: Minimum stock level
 *         maximumStock:
 *           type: number
 *           minimum: 1
 *           description: Maximum stock level
 *         unit:
 *           type: string
 *           enum: [bottles, liters, gallons, pieces, servings]
 *           description: Stock unit
 *         costPerUnit:
 *           type: number
 *           minimum: 0
 *           description: Cost per unit
 *         supplier:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             contact:
 *               type: object
 *               properties:
 *                 phone:
 *                   type: string
 *                 email:
 *                   type: string
 *         lastRestocked:
 *           type: string
 *           format: date-time
 *         restockHistory:
 *           type: array
 *           items:
 *             type: object
 *         alertSettings:
 *           type: object
 *           properties:
 *             isEnabled:
 *               type: boolean
 *             frequency:
 *               type: string
 *               enum: [immediate, daily, weekly, monthly]
 *             alertThreshold:
 *               type: number
 *               minimum: 0
 *         isActive:
 *           type: boolean
 *         stockStatus:
 *           type: string
 *           enum: [sufficient, low, critical, out_of_stock]
 *         daysSinceLastRestock:
 *           type: number
 */

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Get all inventory items with filtering (Admin only)
 *     tags: [Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [sufficient, low, critical, out_of_stock]
 *         description: Filter by stock status
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter for low stock items only
 *       - in: query
 *         name: criticalStock
 *         schema:
 *           type: boolean
 *         description: Filter for critical stock items only
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Inventory items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 inventory:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Inventory'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     lowStock:
 *                       type: integer
 *                     criticalStock:
 *                       type: integer
 *                     outOfStock:
 *                       type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, lowStock, criticalStock, limit = 20, page = 1 } = req.query;

    // Build filter
    const filter = { isActive: true };
    
    if (status) {
      // Add status filter based on stock levels
      switch (status) {
        case 'out_of_stock':
          filter.currentStock = 0;
          break;
        case 'critical':
          filter.$expr = { $lte: ['$currentStock', '$alertSettings.alertThreshold'] };
          break;
        case 'low':
          filter.$expr = { $lte: ['$currentStock', '$minimumStock'] };
          break;
        case 'sufficient':
          filter.$expr = { $gt: ['$currentStock', '$minimumStock'] };
          break;
      }
    }

    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$currentStock', '$minimumStock'] };
    }

    if (criticalStock === 'true') {
      filter.$expr = { $lte: ['$currentStock', '$alertSettings.alertThreshold'] };
    }

    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    const [inventory, total] = await Promise.all([
      Inventory.find(filter)
        .populate('cocktail', 'name description image')
        .sort({ currentStock: 1 })
        .skip(skip)
        .limit(limitNum),
      Inventory.countDocuments(filter)
    ]);

    // Get summary statistics
    const summary = {
      totalItems: await Inventory.countDocuments({ isActive: true }),
      lowStock: await Inventory.countDocuments({
        isActive: true,
        $expr: { $lte: ['$currentStock', '$minimumStock'] }
      }),
      criticalStock: await Inventory.countDocuments({
        isActive: true,
        $expr: { $lte: ['$currentStock', '$alertSettings.alertThreshold'] }
      }),
      outOfStock: await Inventory.countDocuments({
        isActive: true,
        currentStock: 0
      })
    };

    res.json({
      success: true,
      inventory,
      summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory',
      message: 'Unable to retrieve inventory at this time'
    });
  }
});

/**
 * @swagger
 * /inventory:
 *   post:
 *     summary: Create inventory item for a cocktail (Admin only)
 *     tags: [Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cocktail
 *               - currentStock
 *               - minimumStock
 *               - maximumStock
 *             properties:
 *               cocktail:
 *                 type: string
 *                 description: Cocktail ID
 *               currentStock:
 *                 type: number
 *                 minimum: 0
 *               minimumStock:
 *                 type: number
 *                 minimum: 0
 *               maximumStock:
 *                 type: number
 *                 minimum: 1
 *               unit:
 *                 type: string
 *                 enum: [bottles, liters, gallons, pieces, servings]
 *               costPerUnit:
 *                 type: number
 *                 minimum: 0
 *               supplier:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   contact:
 *                     type: object
 *                     properties:
 *                       phone:
 *                         type: string
 *                       email:
 *                         type: string
 *               alertSettings:
 *                 type: object
 *                 properties:
 *                   isEnabled:
 *                     type: boolean
 *                   frequency:
 *                     type: string
 *                     enum: [immediate, daily, weekly, monthly]
 *                   alertThreshold:
 *                     type: number
 *                     minimum: 0
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 inventory:
 *                   $ref: '#/components/schemas/Inventory'
 *       400:
 *         description: Validation error or cocktail already has inventory
 *       404:
 *         description: Cocktail not found
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireAdmin, [
  body('cocktail')
    .isMongoId()
    .withMessage('Invalid cocktail ID'),
  body('currentStock')
    .isFloat({ min: 0 })
    .withMessage('Current stock must be a non-negative number'),
  body('minimumStock')
    .isFloat({ min: 0 })
    .withMessage('Minimum stock must be a non-negative number'),
  body('maximumStock')
    .isFloat({ min: 1 })
    .withMessage('Maximum stock must be at least 1'),
  body('unit')
    .optional()
    .isIn(['bottles', 'liters', 'gallons', 'pieces', 'servings'])
    .withMessage('Invalid unit'),
  body('costPerUnit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost per unit must be a non-negative number'),
  body('alertSettings.frequency')
    .optional()
    .isIn(['immediate', 'daily', 'weekly', 'monthly'])
    .withMessage('Invalid alert frequency')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      cocktail,
      currentStock,
      minimumStock,
      maximumStock,
      unit = 'servings',
      costPerUnit = 0,
      supplier,
      alertSettings
    } = req.body;

    // Check if cocktail exists
    const cocktailExists = await Cocktail.findById(cocktail);
    if (!cocktailExists) {
      return res.status(404).json({
        error: 'Cocktail not found',
        message: 'The specified cocktail does not exist'
      });
    }

    // Check if inventory already exists for this cocktail
    const existingInventory = await Inventory.findOne({ cocktail });
    if (existingInventory) {
      return res.status(400).json({
        error: 'Inventory already exists',
        message: 'Inventory record already exists for this cocktail'
      });
    }

    // Create inventory item
    const inventory = new Inventory({
      cocktail,
      currentStock,
      minimumStock,
      maximumStock,
      unit,
      costPerUnit,
      supplier,
      alertSettings: {
        isEnabled: alertSettings?.isEnabled ?? true,
        frequency: alertSettings?.frequency ?? 'daily',
        alertThreshold: alertSettings?.alertThreshold ?? 5
      }
    });

    await inventory.save();
    await inventory.populate('cocktail', 'name description image');

    res.status(201).json({
      success: true,
      inventory
    });
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({
      error: 'Failed to create inventory item',
      message: 'Unable to create inventory item at this time'
    });
  }
});

/**
 * @swagger
 * /inventory/{id}/restock:
 *   post:
 *     summary: Restock inventory item (Admin only)
 *     tags: [Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 description: Quantity to add to stock
 *               cost:
 *                 type: number
 *                 minimum: 0
 *                 description: Total cost of restock
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Restock notes
 *     responses:
 *       200:
 *         description: Inventory restocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 inventory:
 *                   $ref: '#/components/schemas/Inventory'
 *                 restockInfo:
 *                   type: object
 *                   properties:
 *                     quantityAdded:
 *                       type: number
 *                     previousStock:
 *                       type: number
 *                     newStock:
 *                       type: number
 *                     totalCost:
 *                       type: number
 *       400:
 *         description: Validation error
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/restock', authenticateToken, requireAdmin, [
  body('quantity')
    .isFloat({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost must be a non-negative number'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { quantity, cost = 0, notes = '' } = req.body;

    const inventory = await Inventory.findById(id);
    if (!inventory) {
      return res.status(404).json({
        error: 'Inventory item not found',
        message: 'The specified inventory item does not exist'
      });
    }

    const previousStock = inventory.currentStock;

    // Add stock using the model method
    await inventory.addStock(quantity, cost, req.user.email, notes);

    await inventory.populate('cocktail', 'name description image');

    res.json({
      success: true,
      inventory,
      restockInfo: {
        quantityAdded: quantity,
        previousStock,
        newStock: inventory.currentStock,
        totalCost: cost
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        error: 'Invalid inventory ID',
        message: 'The provided inventory ID is not valid'
      });
    }

    console.error('Restock inventory error:', error);
    res.status(500).json({
      error: 'Failed to restock inventory',
      message: 'Unable to restock inventory at this time'
    });
  }
});

/**
 * @swagger
 * /inventory/{id}:
 *   put:
 *     summary: Update inventory item settings (Admin only)
 *     tags: [Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               minimumStock:
 *                 type: number
 *                 minimum: 0
 *               maximumStock:
 *                 type: number
 *                 minimum: 1
 *               unit:
 *                 type: string
 *                 enum: [bottles, liters, gallons, pieces, servings]
 *               costPerUnit:
 *                 type: number
 *                 minimum: 0
 *               supplier:
 *                 type: object
 *               alertSettings:
 *                 type: object
 *                 properties:
 *                   isEnabled:
 *                     type: boolean
 *                   frequency:
 *                     type: string
 *                     enum: [immediate, daily, weekly, monthly]
 *                   alertThreshold:
 *                     type: number
 *                     minimum: 0
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const inventory = await Inventory.findById(id);
    if (!inventory) {
      return res.status(404).json({
        error: 'Inventory item not found',
        message: 'The specified inventory item does not exist'
      });
    }

    // Update inventory item
    Object.assign(inventory, updateData);
    await inventory.save();
    await inventory.populate('cocktail', 'name description image');

    res.json({
      success: true,
      inventory
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        error: 'Invalid inventory ID',
        message: 'The provided inventory ID is not valid'
      });
    }

    console.error('Update inventory error:', error);
    res.status(500).json({
      error: 'Failed to update inventory',
      message: 'Unable to update inventory at this time'
    });
  }
});

/**
 * @swagger
 * /inventory/report:
 *   get:
 *     summary: Generate inventory report (Admin only)
 *     tags: [Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 report:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     summary:
 *                       type: object
 *                     lowStock:
 *                       type: array
 *                     criticalStock:
 *                       type: array
 *                     outOfStock:
 *                       type: array
 *       500:
 *         description: Internal server error
 */
router.get('/report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = await inventoryAlertService.generateInventoryReport();

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Generate inventory report error:', error);
    res.status(500).json({
      error: 'Failed to generate inventory report',
      message: 'Unable to generate inventory report at this time'
    });
  }
});

/**
 * @swagger
 * /inventory/check-alerts:
 *   post:
 *     summary: Manually trigger inventory level check (Admin only)
 *     tags: [Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory level check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 alertsSent:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
router.post('/check-alerts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await inventoryAlertService.checkInventoryLevels();

    res.json({
      success: true,
      message: 'Inventory level check completed',
      alertsSent: 'Check logs for details'
    });
  } catch (error) {
    console.error('Check inventory alerts error:', error);
    res.status(500).json({
      error: 'Failed to check inventory alerts',
      message: 'Unable to check inventory alerts at this time'
    });
  }
});

module.exports = router;
