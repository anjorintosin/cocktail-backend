const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const emailService = require('../services/emailService');

const router = express.Router();

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalOrders:
 *                       type: integer
 *                       description: Total number of orders
 *                     pendingOrders:
 *                       type: integer
 *                       description: Number of pending orders
 *                     paidOrders:
 *                       type: integer
 *                       description: Number of paid orders
 *                     totalRevenue:
 *                       type: number
 *                       description: Total revenue in NGN
 *                     totalCocktails:
 *                       type: integer
 *                       description: Total number of cocktails
 *                     activeCocktails:
 *                       type: integer
 *                       description: Number of active cocktails
 *                     ordersByState:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           state:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     recentOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Recent order details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const Order = require('../models/Order');
    const Cocktail = require('../models/Cocktail');
    const Payment = require('../models/Payment');

    // Get basic statistics
    const [
      totalOrders,
      pendingOrders,
      paidOrders,
      totalCocktails,
      activeCocktails,
      totalRevenue
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ fulfillmentStatus: 'new' }),
      Order.countDocuments({ paymentStatus: 'paid' }),
      Cocktail.countDocuments(),
      Cocktail.countDocuments({ isActive: true }),
      Payment.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // Get orders by state
    const ordersByState = await Order.aggregate([
      {
        $group: {
          _id: '$customer.state',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          state: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('items.cocktail', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber customer totalAmount paymentStatus fulfillmentStatus createdAt');

    const dashboardStats = {
      totalOrders,
      pendingOrders,
      paidOrders,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total / 100 : 0, // Convert from kobo to NGN
      totalCocktails,
      activeCocktails,
      ordersByState,
      recentOrders
    };

    res.json({
      success: true,
      statistics: dashboardStats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: 'Unable to retrieve dashboard statistics at this time'
    });
  }
});

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: Get all orders with advanced filtering (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by customer state
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: fulfillmentStatus
 *         schema:
 *           type: string
 *           enum: [new, preparing, delivered, cancelled]
 *         description: Filter by fulfillment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date (YYYY-MM-DD)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by order number or customer name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of orders to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
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
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    const {
      state,
      paymentStatus,
      fulfillmentStatus,
      startDate,
      endDate,
      search,
      limit = 20,
      page = 1
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (state) {
      filter['customer.state'] = state;
    }
    
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }
    
    if (fulfillmentStatus) {
      filter.fulfillmentStatus = fulfillmentStatus;
    }

    // Date filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Search filtering
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.cocktail', 'name description image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: 'Unable to retrieve orders at this time'
    });
  }
});

/**
 * @swagger
 * /admin/cocktails:
 *   get:
 *     summary: Get all cocktails with filtering (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by available state
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by cocktail name or description
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of cocktails to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Cocktails retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 cocktails:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cocktail'
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
router.get('/cocktails', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const Cocktail = require('../models/Cocktail');
    
    const {
      state,
      isActive,
      search,
      limit = 20,
      page = 1
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (state) {
      filter.availableStates = state;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Search filtering
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    const [cocktails, total] = await Promise.all([
      Cocktail.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Cocktail.countDocuments(filter)
    ]);

    res.json({
      success: true,
      cocktails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get admin cocktails error:', error);
    res.status(500).json({
      error: 'Failed to fetch cocktails',
      message: 'Unable to retrieve cocktails at this time'
    });
  }
});

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: Get all payments with filtering (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, success, failed, abandoned]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments until this date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of payments to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
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
router.get('/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    
    const {
      status,
      startDate,
      endDate,
      limit = 20,
      page = 1
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }

    // Date filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('order', 'orderNumber customer paymentStatus fulfillmentStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Payment.countDocuments(filter)
    ]);

    res.json({
      success: true,
      payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get admin payments error:', error);
    res.status(500).json({
      error: 'Failed to fetch payments',
      message: 'Unable to retrieve payments at this time'
    });
  }
});

/**
 * @swagger
 * /admin/orders/{id}/status:
 *   patch:
 *     summary: Update order status with email notifications (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fulfillmentStatus
 *             properties:
 *               fulfillmentStatus:
 *                 type: string
 *                 enum: [new, preparing, in_route, delivered, cancelled]
 *                 description: New fulfillment status
 *               adminNote:
 *                 type: string
 *                 maxLength: 500
 *                 description: Admin note for the status update
 *               sendEmailNotification:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to send email notification to customer
 *               estimatedDeliveryTime:
 *                 type: string
 *                 format: date-time
 *                 description: Estimated delivery time (optional)
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *                 emailSent:
 *                   type: boolean
 *                   description: Whether email notification was sent
 *                 statusUpdate:
 *                   type: object
 *                   properties:
 *                     previousStatus:
 *                       type: string
 *                     newStatus:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.patch('/orders/:id/status', authenticateToken, requireAdmin, [
  body('fulfillmentStatus')
    .isIn(['new', 'preparing', 'in_route', 'delivered', 'cancelled'])
    .withMessage('Invalid fulfillment status'),
  body('adminNote')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Admin note cannot exceed 500 characters'),
  body('sendEmailNotification')
    .optional()
    .isBoolean()
    .withMessage('sendEmailNotification must be a boolean'),
  body('estimatedDeliveryTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid estimated delivery time format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const Order = require('../models/Order');
    const { id } = req.params;
    const { 
      fulfillmentStatus, 
      adminNote = '', 
      sendEmailNotification = true,
      estimatedDeliveryTime 
    } = req.body;

    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'The order you are trying to update does not exist'
      });
    }

    const previousStatus = order.fulfillmentStatus;

    // Update order status
    order.fulfillmentStatus = fulfillmentStatus;
    
    // Add admin note if provided
    if (adminNote) {
      order.adminNotes = order.adminNotes || [];
      order.adminNotes.push({
        note: adminNote,
        addedBy: req.user.email,
        addedAt: new Date()
      });
    }

    // Add estimated delivery time if provided
    if (estimatedDeliveryTime) {
      order.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
    }

    await order.save();
    await order.populate('items.cocktail', 'name description image');

    let emailSent = false;
    
    // Send email notification if requested
    if (sendEmailNotification) {
      try {
        // Add customer email to order if not present (for demo purposes)
        const customerEmail = order.customer.email || `${order.customer.phone.replace(/\D/g, '')}@example.com`;
        
        const emailResult = await emailService.sendOrderStatusUpdateEmail(
          { ...order.toObject(), customer: { ...order.customer, email: customerEmail } },
          fulfillmentStatus,
          adminNote
        );
        
        emailSent = emailResult.success;
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      order,
      emailSent,
      statusUpdate: {
        previousStatus,
        newStatus: fulfillmentStatus,
        updatedAt: order.updatedAt,
        adminNote,
        estimatedDeliveryTime: order.estimatedDeliveryTime
      }
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        error: 'Invalid order ID',
        message: 'The provided order ID is not valid'
      });
    }

    console.error('Update order status error:', error);
    res.status(500).json({
      error: 'Failed to update order status',
      message: 'Unable to update order status at this time'
    });
  }
});

/**
 * @swagger
 * /admin/orders/{id}/track:
 *   get:
 *     summary: Get detailed order tracking information (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order tracking information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *                 trackingInfo:
 *                   type: object
 *                   properties:
 *                     orderNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                     adminNotes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     estimatedDelivery:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get('/orders/:id/track', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const Order = require('../models/Order');
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('items.cocktail', 'name description image');

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'The requested order does not exist'
      });
    }

    // Create detailed timeline
    const timeline = [
      {
        status: 'placed',
        timestamp: order.createdAt,
        description: 'Order placed successfully',
        icon: '📝'
      }
    ];

    if (order.paymentStatus === 'paid') {
      timeline.push({
        status: 'payment_confirmed',
        timestamp: order.updatedAt,
        description: 'Payment confirmed',
        icon: '💳'
      });
    }

    // Add status-specific timeline entries
    switch (order.fulfillmentStatus) {
      case 'preparing':
        timeline.push({
          status: 'preparing',
          timestamp: order.updatedAt,
          description: 'Order is being prepared',
          icon: '👨‍🍳'
        });
        break;
      case 'in_route':
        timeline.push(
          {
            status: 'preparing',
            timestamp: order.updatedAt,
            description: 'Order prepared',
            icon: '✅'
          },
          {
            status: 'in_route',
            timestamp: order.updatedAt,
            description: 'Order is on the way',
            icon: '🚚'
          }
        );
        break;
      case 'delivered':
        timeline.push(
          {
            status: 'preparing',
            timestamp: order.updatedAt,
            description: 'Order prepared',
            icon: '✅'
          },
          {
            status: 'in_route',
            timestamp: order.updatedAt,
            description: 'Order delivered',
            icon: '🚚'
          },
          {
            status: 'delivered',
            timestamp: order.updatedAt,
            description: 'Order delivered successfully',
            icon: '🎉'
          }
        );
        break;
      case 'cancelled':
        timeline.push({
          status: 'cancelled',
          timestamp: order.updatedAt,
          description: 'Order cancelled',
          icon: '❌'
        });
        break;
    }

    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      timeline,
      adminNotes: order.adminNotes || [],
      estimatedDelivery: order.estimatedDeliveryTime || (() => {
        const estimated = new Date(order.createdAt);
        estimated.setHours(estimated.getHours() + 3);
        return estimated;
      })()
    };

    res.json({
      success: true,
      order,
      trackingInfo
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        error: 'Invalid order ID',
        message: 'The provided order ID is not valid'
      });
    }

    console.error('Get order tracking error:', error);
    res.status(500).json({
      error: 'Failed to get order tracking',
      message: 'Unable to retrieve order tracking information at this time'
    });
  }
});

module.exports = router;
