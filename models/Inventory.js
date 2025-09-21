const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  cocktail: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cocktail',
    required: true,
    unique: true
  },
  currentStock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  minimumStock: {
    type: Number,
    required: true,
    min: [0, 'Minimum stock cannot be negative'],
    default: 10
  },
  maximumStock: {
    type: Number,
    required: true,
    min: [1, 'Maximum stock must be at least 1'],
    default: 100
  },
  unit: {
    type: String,
    enum: ['bottles', 'liters', 'gallons', 'pieces', 'servings'],
    default: 'servings'
  },
  costPerUnit: {
    type: Number,
    min: [0, 'Cost cannot be negative'],
    default: 0
  },
  supplier: {
    name: {
      type: String,
      trim: true
    },
    contact: {
      phone: String,
      email: String
    }
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  },
  restockHistory: [{
    quantity: {
      type: Number,
      required: true
    },
    cost: {
      type: Number,
      default: 0
    },
    restockedBy: {
      type: String,
      required: true
    },
    restockedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  }],
  alertSettings: {
    isEnabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    lastAlertSent: {
      type: Date
    },
    alertThreshold: {
      type: Number,
      min: [0, 'Alert threshold cannot be negative'],
      default: 5
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
inventorySchema.index({ currentStock: 1, minimumStock: 1 });
inventorySchema.index({ isActive: 1 });

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.alertSettings.alertThreshold) return 'critical';
  if (this.currentStock <= this.minimumStock) return 'low';
  return 'sufficient';
});

// Virtual for days since last restock
inventorySchema.virtual('daysSinceLastRestock').get(function() {
  const now = new Date();
  const lastRestock = new Date(this.lastRestocked);
  const diffTime = Math.abs(now - lastRestock);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if stock is low
inventorySchema.methods.isStockLow = function() {
  return this.currentStock <= this.minimumStock;
};

// Method to check if stock is critical
inventorySchema.methods.isStockCritical = function() {
  return this.currentStock <= this.alertSettings.alertThreshold;
};

// Method to add stock (restock)
inventorySchema.methods.addStock = function(quantity, cost, restockedBy, notes = '') {
  this.currentStock += quantity;
  this.lastRestocked = new Date();
  
  this.restockHistory.push({
    quantity,
    cost,
    restockedBy,
    restockedAt: new Date(),
    notes
  });
  
  // Keep only last 50 restock records
  if (this.restockHistory.length > 50) {
    this.restockHistory = this.restockHistory.slice(-50);
  }
  
  return this.save();
};

// Method to reduce stock (when order is placed)
inventorySchema.methods.reduceStock = function(quantity) {
  if (this.currentStock < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.currentStock}, Required: ${quantity}`);
  }
  
  this.currentStock -= quantity;
  return this.save();
};

// Static method to find low stock items
inventorySchema.statics.findLowStock = function() {
  return this.find({
    isActive: true,
    $expr: {
      $lte: ['$currentStock', '$minimumStock']
    }
  }).populate('cocktail', 'name description image');
};

// Static method to find critical stock items
inventorySchema.statics.findCriticalStock = function() {
  return this.find({
    isActive: true,
    $expr: {
      $lte: ['$currentStock', '$alertSettings.alertThreshold']
    }
  }).populate('cocktail', 'name description image');
};

// Ensure virtual fields are serialized
inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', inventorySchema);
