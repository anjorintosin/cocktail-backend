const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  cocktail: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cocktail',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [99, 'Quantity cannot exceed 99']
  },
  price: {
    type: Number,
    required: true
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
cartSchema.index({ user: 1 });

// Virtual to calculate totals
cartSchema.virtual('calculatedTotal').get(function() {
  return this.items.reduce((total, item) => total + (item.cocktail?.price || 0) * item.quantity, 0);
});

cartSchema.virtual('calculatedItemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Pre-save middleware to update totals and store prices
cartSchema.pre('save', async function(next) {
  if (this.items && this.items.length > 0) {
    // Populate cocktail prices for calculation
    await this.populate('items.cocktail', 'price');
    
    // Update item prices and calculate totals
    this.totalAmount = 0;
    this.totalItems = 0;
    
    this.items.forEach(item => {
      if (item.cocktail && item.cocktail.price) {
        item.price = item.cocktail.price;
        this.totalAmount += item.cocktail.price * item.quantity;
      }
      this.totalItems += item.quantity;
    });
  } else {
    this.totalAmount = 0;
    this.totalItems = 0;
  }
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
