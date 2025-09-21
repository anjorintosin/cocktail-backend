const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - order
 *         - paystackReference
 *         - amount
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the payment
 *         order:
 *           type: string
 *           description: Order ID
 *         paystackReference:
 *           type: string
 *           description: Paystack payment reference
 *         amount:
 *           type: number
 *           description: Payment amount in kobo
 *         currency:
 *           type: string
 *           description: Payment currency
 *         status:
 *           type: string
 *           enum: [pending, success, failed, abandoned]
 *           description: Payment status
 *         gatewayResponse:
 *           type: object
 *           description: Response from payment gateway
 *         webhookData:
 *           type: object
 *           description: Webhook data from payment gateway
 *         paidAt:
 *           type: string
 *           format: date-time
 *           description: When payment was completed
 *         failureReason:
 *           type: string
 *           description: Reason for payment failure
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PaymentRequest:
 *       type: object
 *       required:
 *         - orderId
 *         - email
 *       properties:
 *         orderId:
 *           type: string
 *           description: Order ID to pay for
 *         email:
 *           type: string
 *           format: email
 *           description: Customer email for payment
 *         callbackUrl:
 *           type: string
 *           description: Callback URL for payment completion
 */

/**
 * @swagger
 * /payments/initialize:
 *   post:
 *     summary: Initialize payment for an order (Public endpoint)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - email
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID to pay for
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer email for payment
 *               callbackUrl:
 *                 type: string
 *                 description: Callback URL for payment completion
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payment:
 *                   type: object
 *                   properties:
 *                     authorizationUrl:
 *                       type: string
 *                       description: URL to redirect customer for payment
 *                     accessCode:
 *                       type: string
 *                       description: Payment access code
 *                     reference:
 *                       type: string
 *                       description: Payment reference
 *       400:
 *         description: Invalid order or order already paid
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.post('/initialize', async (req, res) => {
  try {
    const { orderId, email, callbackUrl } = req.body;

    if (!orderId || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Order ID and email are required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'The specified order does not exist'
      });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        error: 'Order already paid',
        message: 'This order has already been paid for'
      });
    }

    // Check if payment already exists for this order
    let payment = await Payment.findOne({ order: orderId });
    
    if (payment && payment.status === 'success') {
      return res.status(400).json({
        error: 'Order already paid',
        message: 'This order has already been paid for'
      });
    }

    // Prepare Paystack payment data
    const amountInKobo = Math.round(order.totalAmount * 100); // Convert NGN to kobo
    const reference = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const paymentData = {
      email: email,
      amount: amountInKobo,
      currency: 'NGN',
      reference: reference,
      callback_url: callbackUrl || `${process.env.BASE_URL}/payments/callback`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerName: order.customer.name
      }
    };

    // Initialize payment with Paystack
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (paystackResponse.data.status !== true) {
      throw new Error('Paystack initialization failed');
    }

    const paystackData = paystackResponse.data.data;

    // Create or update payment record
    if (payment) {
      payment.paystackReference = reference;
      payment.amount = amountInKobo;
      payment.gatewayResponse = paystackData;
      payment.status = 'pending';
      await payment.save();
    } else {
      payment = new Payment({
        order: order._id,
        paystackReference: reference,
        amount: amountInKobo,
        currency: 'NGN',
        gatewayResponse: paystackData,
        status: 'pending'
      });
      await payment.save();
    }

    // Update order with payment reference
    order.paymentReference = reference;
    order.paymentStatus = 'pending';
    await order.save();

    res.json({
      success: true,
      payment: {
        authorizationUrl: paystackData.authorization_url,
        accessCode: paystackData.access_code,
        reference: reference
      }
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    
    if (error.response && error.response.data) {
      return res.status(400).json({
        error: 'Payment initialization failed',
        message: error.response.data.message || 'Unable to initialize payment'
      });
    }

    res.status(500).json({
      error: 'Payment initialization failed',
      message: 'Unable to initialize payment at this time'
    });
  }
});

/**
 * @swagger
 * /payments/verify/{reference}:
 *   get:
 *     summary: Verify payment status (Public endpoint)
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment reference from Paystack
 *     responses:
 *       200:
 *         description: Payment verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payment:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [pending, success, failed, abandoned]
 *                     amount:
 *                       type: number
 *                     reference:
 *                       type: string
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                     order:
 *                       type: object
 *                       description: Associated order details
 *       400:
 *         description: Invalid reference or payment verification failed
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    // Verify payment with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    if (paystackResponse.data.status !== true) {
      throw new Error('Paystack verification failed');
    }

    const paystackData = paystackResponse.data.data;

    // Find payment record
    const payment = await Payment.findOne({ paystackReference: reference })
      .populate('order');
    
    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        message: 'Payment record not found'
      });
    }

    // Update payment status based on Paystack response
    const isSuccessful = paystackData.status === 'success';
    const newStatus = isSuccessful ? 'success' : 
                     paystackData.status === 'failed' ? 'failed' : 'pending';

    payment.status = newStatus;
    payment.webhookData = paystackData;
    
    if (isSuccessful) {
      payment.paidAt = new Date(paystackData.paid_at);
    } else if (paystackData.status === 'failed') {
      payment.failureReason = paystackData.gateway_response || 'Payment failed';
    }

    await payment.save();

    // Update order status
    const order = payment.order;
    order.paymentStatus = isSuccessful ? 'paid' : 
                         paystackData.status === 'failed' ? 'failed' : 'pending';
    await order.save();

    res.json({
      success: true,
      payment: {
        status: payment.status,
        amount: payment.amount,
        reference: payment.paystackReference,
        paidAt: payment.paidAt,
        order: order
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    
    if (error.response && error.response.data) {
      return res.status(400).json({
        error: 'Payment verification failed',
        message: error.response.data.message || 'Unable to verify payment'
      });
    }

    res.status(500).json({
      error: 'Payment verification failed',
      message: 'Unable to verify payment at this time'
    });
  }
});

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Handle Paystack webhook (Internal endpoint)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 *       500:
 *         description: Internal server error
 */
router.post('/webhook', async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({
        error: 'Invalid signature',
        message: 'Webhook signature verification failed'
      });
    }

    const event = req.body;
    const { reference } = event.data;

    if (event.event === 'charge.success') {
      // Find payment record
      const payment = await Payment.findOne({ paystackReference: reference })
        .populate('order');
      
      if (payment && payment.status !== 'success') {
        // Update payment status
        payment.status = 'success';
        payment.paidAt = new Date();
        payment.webhookData = event.data;
        await payment.save();

        // Update order status
        const order = payment.order;
        order.paymentStatus = 'paid';
        await order.save();

        console.log(`Payment successful for order ${order.orderNumber}`);
      }
    } else if (event.event === 'charge.failed') {
      // Find payment record
      const payment = await Payment.findOne({ paystackReference: reference })
        .populate('order');
      
      if (payment) {
        // Update payment status
        payment.status = 'failed';
        payment.failureReason = event.data.gateway_response || 'Payment failed';
        payment.webhookData = event.data;
        await payment.save();

        // Update order status
        const order = payment.order;
        order.paymentStatus = 'failed';
        await order.save();

        console.log(`Payment failed for order ${order.orderNumber}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: 'Unable to process webhook'
    });
  }
});

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get all payments with filtering (Admin only)
 *     tags: [Payments]
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
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;

    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
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
    console.error('Get payments error:', error);
    res.status(500).json({
      error: 'Failed to fetch payments',
      message: 'Unable to retrieve payments at this time'
    });
  }
});

module.exports = router;
