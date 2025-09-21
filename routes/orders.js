const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const Cocktail = require('../models/Cocktail');
const Cart = require('../models/Cart');
const { authenticateToken, requireAdmin, requireCustomer } = require('../middleware/auth');
const { validateOrder, validateOrderStatusUpdate } = require('../middleware/validation');
const inventoryAlertService = require('../services/inventoryAlertService');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       required:
 *         - cocktail
 *         - quantity
 *         - price
 *       properties:
 *         cocktail:
 *           type: string
 *           description: Cocktail ID
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantity of the cocktail
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Price of the cocktail at time of order
 *     Customer:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *         - address
 *         - state
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Customer name
 *         phone:
 *           type: string
 *           maxLength: 15
 *           description: Customer phone number
 *         address:
 *           type: string
 *           maxLength: 500
 *           description: Customer address
 *         state:
 *           type: string
 *           enum: [Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara]
 *           description: Customer state
 *     Order:
 *       type: object
 *       required:
 *         - customer
 *         - items
 *         - idempotencyKey
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the order
 *         orderNumber:
 *           type: string
 *           description: Auto-generated order number
 *         idempotencyKey:
 *           type: string
 *           description: Unique key to prevent duplicate orders
 *         customer:
 *           $ref: '#/components/schemas/Customer'
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         subtotal:
 *           type: number
 *           description: Subtotal amount
 *         totalAmount:
 *           type: number
 *           description: Total amount including any fees
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *           description: Payment status
 *         fulfillmentStatus:
 *           type: string
 *           enum: [new, preparing, delivered, cancelled]
 *           description: Order fulfillment status
 *         paymentReference:
 *           type: string
 *           description: Payment reference from gateway
 *         notes:
 *           type: string
 *           maxLength: 500
 *           description: Additional order notes
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order (Guest ordering - No signup required)
 *     tags: [Orders]
 *     description: |
 *       This endpoint allows guests to place orders without creating an account.
 *       Simply provide your contact details, select cocktails, and place your order.
 *       You'll receive an order number that you can use to track your order.
 *       
 *       **Order Flow:**
 *       1. Browse cocktails: `GET /catalog?state=Lagos`
 *       2. Create order: `POST /orders` (this endpoint)
 *       3. Track order: `GET /orders/{orderNumber}`
 *       4. Initialize payment: `POST /payments/initialize`
 *       5. Verify payment: `GET /payments/verify/{reference}`
 *       
 *       **Idempotency Key:** Use a unique string to prevent duplicate orders.
 *       You can use: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer
 *               - items
 *               - idempotencyKey
 *             properties:
 *               customer:
 *                 $ref: '#/components/schemas/Customer'
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/OrderItem'
 *                 description: Array of cocktails to order
 *               idempotencyKey:
 *                 type: string
 *                 example: "order-12345-unique-key"
 *                 description: Unique key to prevent duplicate orders
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Please call before delivery"
 *                 description: Additional delivery instructions
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *                 orderNumber:
 *                   type: string
 *                   description: Use this number to track your order
 *                 trackingUrl:
 *                   type: string
 *                   description: Direct URL to track this order
 *                 nextSteps:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: string
 *                       description: Next step - initialize payment
 *                     tracking:
 *                       type: string
 *                       description: How to track your order
 *       400:
 *         description: Validation error or duplicate order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /orders/from-cart:
 *   post:
 *     summary: Create order from user's cart (Authenticated users)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Victoria Island"
 *                   city:
 *                     type: string
 *                     example: "Lagos"
 *                   state:
 *                     type: string
 *                     enum: [Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara]
 *                     example: "Lagos"
 *                   postalCode:
 *                     type: string
 *                     example: "101241"
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Please call before delivery"
 *     responses:
 *       201:
 *         description: Order created successfully from cart
 *       400:
 *         description: Validation error or empty cart
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/from-cart', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const { deliveryAddress, notes } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.cocktail', 'name price images availableStates');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        error: 'Empty cart',
        message: 'Your cart is empty'
      });
    }

    // Use user's profile address if delivery address not provided
    const address = deliveryAddress || req.user.address;
    if (!address || !address.street || !address.city || !address.state) {
      return res.status(400).json({
        error: 'Missing delivery address',
        message: 'Please provide a complete delivery address'
      });
    }

    // Validate cocktails are still available
    const cocktailIds = cart.items.map(item => item.cocktail._id);
    const cocktails = await Cocktail.find({ 
      _id: { $in: cocktailIds }, 
      isActive: true 
    });

    if (cocktails.length !== cocktailIds.length) {
      return res.status(400).json({
        error: 'Invalid cocktails',
        message: 'One or more cocktails are no longer available'
      });
    }

    // Check availability in delivery state
    for (const item of cart.items) {
      const cocktail = cocktails.find(c => c._id.toString() === item.cocktail._id.toString());
      if (!cocktail.availableStates.includes(address.state)) {
        return res.status(400).json({
          error: 'Cocktail not available',
          message: `${cocktail.name} is not available in ${address.state}`
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const cocktail = cocktails.find(c => c._id.toString() === item.cocktail._id.toString());
      const itemTotal = cocktail.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        cocktail: cocktail._id,
        quantity: item.quantity,
        price: cocktail.price
      });
    }

    const totalAmount = subtotal;
    const idempotencyKey = `user-${req.user._id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create order
    const order = new Order({
      user: req.user._id,
      idempotencyKey,
      customer: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        phone: req.user.phone || '',
        address: `${address.street}, ${address.city}, ${address.state}`,
        state: address.state,
        email: req.user.email
      },
      items: orderItems,
      subtotal,
      totalAmount,
      notes
    });

    await order.save();
    await order.populate('items.cocktail', 'name description image images');

    // Clear cart
    cart.items = [];
    await cart.save();

    // Process inventory
    try {
      await inventoryAlertService.processOrderInventory(order);
      console.log(`✅ Inventory processed for order ${order.orderNumber}`);
    } catch (inventoryError) {
      console.error('Inventory processing failed:', inventoryError);
    }

    res.status(201).json({
      success: true,
      order,
      orderNumber: order.orderNumber,
      trackingUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/orders/${order.orderNumber}`,
      nextSteps: {
        payment: `POST ${process.env.BASE_URL || 'http://localhost:3000'}/payments/initialize with orderId: ${order._id}`,
        tracking: `GET ${process.env.BASE_URL || 'http://localhost:3000'}/orders/${order.orderNumber} to track your order`
      }
    });
  } catch (error) {
    console.error('Create order from cart error:', error);
    res.status(500).json({
      error: 'Failed to create order',
      message: 'Unable to create order from cart at this time'
    });
  }
});

router.post('/', validateOrder, async (req, res) => {
  try {
    const { customer, items, idempotencyKey, notes } = req.body;

    // Check for duplicate order using idempotency key
    const existingOrder = await Order.findOne({ idempotencyKey });
    if (existingOrder) {
      return res.status(400).json({
        error: 'Duplicate order',
        message: 'An order with this idempotency key already exists',
        order: existingOrder
      });
    }

    // Validate and fetch cocktails
    const cocktailIds = items.map(item => item.cocktail);
    const cocktails = await Cocktail.find({ 
      _id: { $in: cocktailIds }, 
      isActive: true 
    });

    if (cocktails.length !== cocktailIds.length) {
      return res.status(400).json({
        error: 'Invalid cocktails',
        message: 'One or more cocktails are not available'
      });
    }

    // Validate items and calculate totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const cocktail = cocktails.find(c => c._id.toString() === item.cocktail);
      
      // Check if cocktail is available in customer's state
      if (!cocktail.availableStates.includes(customer.state)) {
        return res.status(400).json({
          error: 'Cocktail not available',
          message: `${cocktail.name} is not available in ${customer.state}`
        });
      }

      const itemTotal = cocktail.price * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        cocktail: cocktail._id,
        quantity: item.quantity,
        price: cocktail.price
      });
    }

    const totalAmount = subtotal; // No additional fees for now

    // Create order
    const order = new Order({
      idempotencyKey,
      customer,
      items: validatedItems,
      subtotal,
      totalAmount,
      notes
    });

    await order.save();

    // Populate cocktail details for response
    await order.populate('items.cocktail', 'name description image images');

    // Process inventory (reduce stock levels)
    try {
      await inventoryAlertService.processOrderInventory(order);
      console.log(`✅ Inventory processed for order ${order.orderNumber}`);
    } catch (inventoryError) {
      console.error('Inventory processing failed:', inventoryError);
      // Don't fail the order if inventory processing fails
      // This allows the order to be created but alerts admin about inventory issues
    }

    res.status(201).json({
      success: true,
      order,
      orderNumber: order.orderNumber,
      trackingUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/orders/${order.orderNumber}`,
      nextSteps: {
        payment: `POST ${process.env.BASE_URL || 'http://localhost:3000'}/payments/initialize with orderId: ${order._id}`,
        tracking: `GET ${process.env.BASE_URL || 'http://localhost:3000'}/orders/${order.orderNumber} to track your order`,
        phoneTracking: `GET ${process.env.BASE_URL || 'http://localhost:3000'}/orders/track/phone/${customer.phone} to see all your orders`
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      error: 'Failed to create order',
      message: 'Unable to create order at this time'
    });
  }
});

/**
 * @swagger
 * /orders/{orderNumber}:
 *   get:
 *     summary: Track order by order number (Public endpoint)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Order number (e.g., ORD-000001)
 *         example: "ORD-000001"
 *     responses:
 *       200:
 *         description: Order retrieved successfully
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
 *                       enum: [new, preparing, delivered, cancelled]
 *                     paymentStatus:
 *                       type: string
 *                       enum: [pending, paid, failed, refunded]
 *                     estimatedDelivery:
 *                       type: string
 *                       format: date-time
 *                       description: Estimated delivery time
 *                     orderProgress:
 *                       type: object
 *                       properties:
 *                         placed:
 *                           type: boolean
 *                           description: Order has been placed
 *                         confirmed:
 *                           type: boolean
 *                           description: Order has been confirmed
 *                         preparing:
 *                           type: boolean
 *                           description: Order is being prepared
 *                         delivered:
 *                           type: boolean
 *                           description: Order has been delivered
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get('/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('items.cocktail', 'name description image images');

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'The requested order does not exist'
      });
    }

    // Calculate estimated delivery time (2-4 hours from order time)
    const estimatedDelivery = new Date(order.createdAt);
    estimatedDelivery.setHours(estimatedDelivery.getHours() + 3); // 3 hours from order

    // Generate order progress tracking
    const orderProgress = {
      placed: true, // Always true if order exists
      confirmed: order.paymentStatus === 'paid',
      preparing: ['preparing'].includes(order.fulfillmentStatus),
      delivered: ['delivered'].includes(order.fulfillmentStatus)
    };

    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      estimatedDelivery: estimatedDelivery.toISOString(),
      orderProgress,
      lastUpdated: order.updatedAt
    };

    res.json({
      success: true,
      order,
      trackingInfo
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      error: 'Failed to fetch order',
      message: 'Unable to retrieve order at this time'
    });
  }
});

/**
 * @swagger
 * /orders/track/phone/{phone}:
 *   get:
 *     summary: Track orders by phone number (Public endpoint)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer phone number
 *         example: "+2348012345678"
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
 *                 customerInfo:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     totalOrders:
 *                       type: integer
 *       404:
 *         description: No orders found for this phone number
 *       500:
 *         description: Internal server error
 */
router.get('/track/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;

    // Find all orders for this phone number
    const orders = await Order.find({ 'customer.phone': phone })
      .populate('items.cocktail', 'name description image')
      .sort({ createdAt: -1 });

    if (orders.length === 0) {
      return res.status(404).json({
        error: 'No orders found',
        message: 'No orders found for this phone number'
      });
    }

    // Get customer info from the most recent order
    const customerInfo = {
      name: orders[0].customer.name,
      phone: orders[0].customer.phone,
      totalOrders: orders.length
    };

    res.json({
      success: true,
      orders,
      customerInfo
    });
  } catch (error) {
    console.error('Track orders by phone error:', error);
    res.status(500).json({
      error: 'Failed to track orders',
      message: 'Unable to retrieve orders at this time'
    });
  }
});

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders with filtering (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara]
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
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      state,
      paymentStatus,
      fulfillmentStatus,
      startDate,
      endDate,
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
        end.setHours(23, 59, 59, 999); // End of day
        filter.createdAt.$lte = end;
      }
    }

    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.cocktail', 'name description image images')
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
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: 'Unable to retrieve orders at this time'
    });
  }
});

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order fulfillment status (Admin only)
 *     tags: [Orders]
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
 *                 enum: [new, preparing, delivered, cancelled]
 *                 description: New fulfillment status
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
router.patch('/:id/status', authenticateToken, requireAdmin, validateOrderStatusUpdate, async (req, res) => {
  try {
    const { fulfillmentStatus } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'The order you are trying to update does not exist'
      });
    }

    order.fulfillmentStatus = fulfillmentStatus;
    await order.save();

    await order.populate('items.cocktail', 'name description image images');

    res.json({
      success: true,
      order
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

module.exports = router;
