const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Cocktail validation rules
const validateCocktail = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('availableStates')
    .isArray({ min: 1 })
    .withMessage('At least one state must be specified'),
  body('availableStates.*')
    .isIn([
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
      'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
      'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa',
      'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
      'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
      'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ])
    .withMessage('Invalid state specified'),
  handleValidationErrors
];

// Order validation rules
const validateOrder = [
  body('customer.name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name must be between 1 and 100 characters'),
  body('customer.phone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 characters'),
  body('customer.address')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address must be between 1 and 500 characters'),
  body('customer.state')
    .isIn([
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
      'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
      'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa',
      'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
      'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
      'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ])
    .withMessage('Invalid state specified'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item must be specified'),
  body('items.*.cocktail')
    .isMongoId()
    .withMessage('Invalid cocktail ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('idempotencyKey')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Idempotency key is required'),
  handleValidationErrors
];

// Order status update validation
const validateOrderStatusUpdate = [
  body('fulfillmentStatus')
    .isIn(['new', 'preparing', 'delivered', 'cancelled'])
    .withMessage('Invalid fulfillment status'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateCocktail,
  validateOrder,
  validateOrderStatusUpdate,
  handleValidationErrors
};
