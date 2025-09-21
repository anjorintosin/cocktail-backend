const express = require('express');
const { body, validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Cocktail = require('../models/Cocktail');
const { authenticateToken, requireCustomer } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management for authenticated users
 */

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 cart:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     user:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           cocktail:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               price:
 *                                 type: number
 *                               image:
 *                                 type: object
 *                               images:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     public_id:
 *                                       type: string
 *                                     url:
 *                                       type: string
 *                                     isPrimary:
 *                                       type: boolean
 *                           quantity:
 *                             type: number
 *                           price:
 *                             type: number
 *                     totalItems:
 *                       type: number
 *                     totalAmount:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, requireCustomer, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.cocktail', 'name price description image images availableStates');

    if (!cart) {
      // Create empty cart if it doesn't exist
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }

    // Filter out cocktails not available in user's state
    const userState = req.user.address?.state;
    if (userState && cart.items.length > 0) {
      cart.items = cart.items.filter(item => 
        item.cocktail && item.cocktail.availableStates.includes(userState)
      );
      await cart.save();
      
      // Re-populate after filtering
      cart = await Cart.findById(cart._id)
        .populate('items.cocktail', 'name price description image images availableStates');
    }

    res.json({
      success: true,
      cart
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      error: 'Failed to retrieve cart',
      message: 'Unable to get cart at this time'
    });
  }
});

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cocktailId
 *               - quantity
 *             properties:
 *               cocktailId:
 *                 type: string
 *                 description: Cocktail ID to add
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 99
 *                 description: Quantity to add
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *       400:
 *         description: Validation error or cocktail not available
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireCustomer, [
  body('cocktailId').isMongoId().withMessage('Invalid cocktail ID'),
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cocktailId, quantity } = req.body;

    // Verify cocktail exists and is active
    const cocktail = await Cocktail.findOne({ _id: cocktailId, isActive: true });
    if (!cocktail) {
      return res.status(400).json({
        error: 'Cocktail not found',
        message: 'The selected cocktail is not available'
      });
    }

    // Check if cocktail is available in user's state
    const userState = req.user.address?.state;
    if (userState && !cocktail.availableStates.includes(userState)) {
      return res.status(400).json({
        error: 'Cocktail not available',
        message: `${cocktail.name} is not available in ${userState}`
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.cocktail.toString() === cocktailId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
      if (cart.items[existingItemIndex].quantity > 99) {
        cart.items[existingItemIndex].quantity = 99;
      }
    } else {
      // Add new item
      cart.items.push({ cocktail: cocktailId, quantity, price: cocktail.price });
    }

    await cart.save();
    
    // Get fresh cart with populated data
    const populatedCart = await Cart.findById(cart._id)
      .populate('items.cocktail', 'name price description image images');

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      cart: populatedCart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      error: 'Failed to add item to cart',
      message: 'Unable to add item to cart at this time'
    });
  }
});

/**
 * @swagger
 * /cart/{cocktailId}:
 *   put:
 *     summary: Update item quantity in cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cocktailId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cocktail ID
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
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 99
 *                 description: New quantity
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Item not found in cart
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:cocktailId', authenticateToken, requireCustomer, [
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cocktailId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        error: 'Cart not found',
        message: 'No cart found for this user'
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.cocktail.toString() === cocktailId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'Item not found in cart'
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    
    // Get fresh cart with populated data
    const populatedCart = await Cart.findById(cart._id)
      .populate('items.cocktail', 'name price description image images');

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      cart: populatedCart
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      error: 'Failed to update cart item',
      message: 'Unable to update cart item at this time'
    });
  }
});

/**
 * @swagger
 * /cart/clear:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/clear', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        error: 'Cart not found',
        message: 'No cart found for this user'
      });
    }

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      error: 'Failed to clear cart',
      message: 'Unable to clear cart at this time'
    });
  }
});

/**
 * @swagger
 * /cart/{cocktailId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cocktailId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cocktail ID to remove
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *       404:
 *         description: Item not found in cart
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/:cocktailId', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const { cocktailId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        error: 'Cart not found',
        message: 'No cart found for this user'
      });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      item => item.cocktail.toString() !== cocktailId
    );

    if (cart.items.length === initialLength) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'Item not found in cart'
      });
    }

    await cart.save();
    
    // Get fresh cart with populated data
    const populatedCart = await Cart.findById(cart._id)
      .populate('items.cocktail', 'name price description image images');

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      cart: populatedCart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      error: 'Failed to remove item from cart',
      message: 'Unable to remove item from cart at this time'
    });
  }
});

module.exports = router;
