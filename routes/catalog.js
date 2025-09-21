const express = require('express');
const Cocktail = require('../models/Cocktail');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateCocktail } = require('../middleware/validation');
const { upload, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Cocktail:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - price
 *         - availableStates
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the cocktail
 *         name:
 *           type: string
 *           description: The cocktail name
 *           maxLength: 100
 *         description:
 *           type: string
 *           description: The cocktail description
 *           maxLength: 500
 *         price:
 *           type: number
 *           description: The cocktail price in NGN
 *           minimum: 0
 *         image:
 *           type: object
 *           properties:
 *             public_id:
 *               type: string
 *               description: Cloudinary public ID
 *             url:
 *               type: string
 *               description: Image URL
 *         availableStates:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara]
 *           description: Nigerian states where the cocktail is available
 *         isActive:
 *           type: boolean
 *           description: Whether the cocktail is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /catalog:
 *   get:
 *     summary: Get cocktails by state (Public endpoint)
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara]
 *         description: Nigerian state to filter cocktails
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
 *       400:
 *         description: Invalid state parameter
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const { state, limit = 20, page = 1 } = req.query;

    if (!state) {
      return res.status(400).json({
        error: 'State parameter is required',
        message: 'Please specify a state to get available cocktails'
      });
    }

    // Validate state
    const validStates = [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
      'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
      'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa',
      'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
      'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
      'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ];

    if (!validStates.includes(state)) {
      return res.status(400).json({
        error: 'Invalid state',
        message: 'Please provide a valid Nigerian state'
      });
    }

    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      availableStates: state,
      isActive: true
    };

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
    console.error('Get cocktails error:', error);
    res.status(500).json({
      error: 'Failed to fetch cocktails',
      message: 'Unable to retrieve cocktails at this time'
    });
  }
});

/**
 * @swagger
 * /catalog/{id}:
 *   get:
 *     summary: Get a specific cocktail by ID (Public endpoint)
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cocktail ID
 *     responses:
 *       200:
 *         description: Cocktail retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 cocktail:
 *                   $ref: '#/components/schemas/Cocktail'
 *       404:
 *         description: Cocktail not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
  try {
    const cocktail = await Cocktail.findById(req.params.id);

    if (!cocktail || !cocktail.isActive) {
      return res.status(404).json({
        error: 'Cocktail not found',
        message: 'The requested cocktail does not exist or is not available'
      });
    }

    res.json({
      success: true,
      cocktail
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        error: 'Invalid cocktail ID',
        message: 'The provided cocktail ID is not valid'
      });
    }

    console.error('Get cocktail error:', error);
    res.status(500).json({
      error: 'Failed to fetch cocktail',
      message: 'Unable to retrieve cocktail at this time'
    });
  }
});

/**
 * @swagger
 * /catalog:
 *   post:
 *     summary: Create a new cocktail (Admin only)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - availableStates
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Mojito"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Refreshing mint and lime cocktail"
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 2500
 *               availableStates:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Lagos", "Abuja"]
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Cocktail image file
 *     responses:
 *       201:
 *         description: Cocktail created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 cocktail:
 *                   $ref: '#/components/schemas/Cocktail'
 *       400:
 *         description: Validation error or missing image
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireAdmin, upload.single('image'), validateCocktail, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Image required',
        message: 'Please upload a cocktail image'
      });
    }

    // Upload image to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

    const cocktailData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      availableStates: Array.isArray(req.body.availableStates) 
        ? req.body.availableStates 
        : JSON.parse(req.body.availableStates),
      image: {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url
      }
    };

    const cocktail = new Cocktail(cocktailData);
    await cocktail.save();

    res.status(201).json({
      success: true,
      cocktail
    });
  } catch (error) {
    console.error('Create cocktail error:', error);
    res.status(500).json({
      error: 'Failed to create cocktail',
      message: 'Unable to create cocktail at this time'
    });
  }
});

/**
 * @swagger
 * /catalog/{id}:
 *   put:
 *     summary: Update a cocktail (Admin only)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cocktail ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               price:
 *                 type: number
 *                 minimum: 0
 *               availableStates:
 *                 type: array
 *                 items:
 *                   type: string
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New cocktail image file (optional)
 *     responses:
 *       200:
 *         description: Cocktail updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 cocktail:
 *                   $ref: '#/components/schemas/Cocktail'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Cocktail not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const cocktail = await Cocktail.findById(req.params.id);
    if (!cocktail) {
      return res.status(404).json({
        error: 'Cocktail not found',
        message: 'The cocktail you are trying to update does not exist'
      });
    }

    const updateData = {
      name: req.body.name || cocktail.name,
      description: req.body.description || cocktail.description,
      price: req.body.price ? parseFloat(req.body.price) : cocktail.price,
      availableStates: req.body.availableStates 
        ? (Array.isArray(req.body.availableStates) 
          ? req.body.availableStates 
          : JSON.parse(req.body.availableStates))
        : cocktail.availableStates
    };

    // Handle image update if provided
    if (req.file) {
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
      updateData.image = {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url
      };
    }

    const updatedCocktail = await Cocktail.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      cocktail: updatedCocktail
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        error: 'Invalid cocktail ID',
        message: 'The provided cocktail ID is not valid'
      });
    }

    console.error('Update cocktail error:', error);
    res.status(500).json({
      error: 'Failed to update cocktail',
      message: 'Unable to update cocktail at this time'
    });
  }
});

/**
 * @swagger
 * /catalog/{id}:
 *   delete:
 *     summary: Delete a cocktail (Admin only)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cocktail ID
 *     responses:
 *       200:
 *         description: Cocktail deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Cocktail not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cocktail = await Cocktail.findById(req.params.id);
    if (!cocktail) {
      return res.status(404).json({
        error: 'Cocktail not found',
        message: 'The cocktail you are trying to delete does not exist'
      });
    }

    await Cocktail.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Cocktail deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        error: 'Invalid cocktail ID',
        message: 'The provided cocktail ID is not valid'
      });
    }

    console.error('Delete cocktail error:', error);
    res.status(500).json({
      error: 'Failed to delete cocktail',
      message: 'Unable to delete cocktail at this time'
    });
  }
});

module.exports = router;
