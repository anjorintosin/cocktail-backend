const express = require('express');
const Order = require('../models/Order');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderTracking:
 *       type: object
 *       properties:
 *         orderNumber:
 *           type: string
 *           description: Order number
 *         status:
 *           type: string
 *           enum: [new, preparing, delivered, cancelled]
 *           description: Current order status
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *           description: Payment status
 *         estimatedDelivery:
 *           type: string
 *           format: date-time
 *           description: Estimated delivery time
 *         orderProgress:
 *           type: object
 *           properties:
 *             placed:
 *               type: boolean
 *               description: Order has been placed
 *             confirmed:
 *               type: boolean
 *               description: Order has been confirmed
 *             preparing:
 *               type: boolean
 *               description: Order is being prepared
 *             delivered:
 *               type: boolean
 *               description: Order has been delivered
 *         timeline:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 */

/**
 * @swagger
 * /tracking/order/{orderNumber}:
 *   get:
 *     summary: Track order status and progress (Public endpoint)
 *     tags: [Order Tracking]
 *     description: |
 *       Get detailed tracking information for an order including status, progress, and estimated delivery time.
 *       This endpoint is perfect for customers to check their order status.
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
 *         description: Order tracking information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orderNumber:
 *                   type: string
 *                 customer:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     address:
 *                       type: string
 *                     state:
 *                       type: string
 *                 tracking:
 *                   $ref: '#/components/schemas/OrderTracking'
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       cocktail:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           image:
 *                             type: object
 *                       quantity:
 *                         type: integer
 *                       price:
 *                         type: number
 *                 totalAmount:
 *                   type: number
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get('/order/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('items.cocktail', 'name description image');

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'The requested order does not exist'
      });
    }

    // Calculate estimated delivery time
    const estimatedDelivery = new Date(order.createdAt);
    estimatedDelivery.setHours(estimatedDelivery.getHours() + 3);

    // Generate order progress
    const orderProgress = {
      placed: true,
      confirmed: order.paymentStatus === 'paid',
      preparing: ['preparing'].includes(order.fulfillmentStatus),
      delivered: ['delivered'].includes(order.fulfillmentStatus)
    };

    // Create timeline
    const timeline = [
      {
        status: 'placed',
        timestamp: order.createdAt,
        description: 'Order placed successfully'
      }
    ];

    if (order.paymentStatus === 'paid') {
      timeline.push({
        status: 'confirmed',
        timestamp: order.updatedAt,
        description: 'Payment confirmed, order being processed'
      });
    }

    if (['preparing', 'delivered'].includes(order.fulfillmentStatus)) {
      timeline.push({
        status: 'preparing',
        timestamp: order.updatedAt,
        description: 'Order is being prepared'
      });
    }

    if (order.fulfillmentStatus === 'delivered') {
      timeline.push({
        status: 'delivered',
        timestamp: order.updatedAt,
        description: 'Order has been delivered'
      });
    }

    const tracking = {
      orderNumber: order.orderNumber,
      status: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      estimatedDelivery: estimatedDelivery.toISOString(),
      orderProgress,
      timeline
    };

    res.json({
      success: true,
      orderNumber: order.orderNumber,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address,
        state: order.customer.state
      },
      tracking,
      items: order.items,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    });
  } catch (error) {
    console.error('Order tracking error:', error);
    res.status(500).json({
      error: 'Failed to track order',
      message: 'Unable to retrieve order tracking information at this time'
    });
  }
});

/**
 * @swagger
 * /tracking/customer/{phone}:
 *   get:
 *     summary: Get all orders for a customer by phone number (Public endpoint)
 *     tags: [Order Tracking]
 *     description: |
 *       Retrieve all orders placed by a customer using their phone number.
 *       This is useful for customers who want to see their order history.
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer phone number
 *         example: "+2348012345678"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of orders to return
 *     responses:
 *       200:
 *         description: Customer orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 customer:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     totalOrders:
 *                       type: integer
 *                     totalSpent:
 *                       type: number
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       orderNumber:
 *                         type: string
 *                       status:
 *                         type: string
 *                       paymentStatus:
 *                         type: string
 *                       totalAmount:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *       404:
 *         description: No orders found for this phone number
 *       500:
 *         description: Internal server error
 */
router.get('/customer/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const orders = await Order.find({ 'customer.phone': phone })
      .populate('items.cocktail', 'name description image')
      .sort({ createdAt: -1 })
      .limit(limit);

    if (orders.length === 0) {
      return res.status(404).json({
        error: 'No orders found',
        message: 'No orders found for this phone number'
      });
    }

    // Calculate customer statistics
    const totalSpent = orders.reduce((sum, order) => {
      return sum + (order.paymentStatus === 'paid' ? order.totalAmount : 0);
    }, 0);

    const customer = {
      name: orders[0].customer.name,
      phone: orders[0].customer.phone,
      totalOrders: orders.length,
      totalSpent
    };

    // Format orders for response
    const formattedOrders = orders.map(order => ({
      orderNumber: order.orderNumber,
      status: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items
    }));

    res.json({
      success: true,
      customer,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Customer tracking error:', error);
    res.status(500).json({
      error: 'Failed to retrieve customer orders',
      message: 'Unable to retrieve customer orders at this time'
    });
  }
});

module.exports = router;
