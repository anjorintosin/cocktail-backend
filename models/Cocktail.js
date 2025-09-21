const mongoose = require('mongoose');

const cocktailSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Cocktail name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  images: [{
    public_id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  // Keep image field for backward compatibility (will be the primary image)
  image: {
    public_id: {
      type: String
    },
    url: {
      type: String
    }
  },
  availableStates: [{
    type: String,
    enum: [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
      'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
      'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa',
      'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
      'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
      'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ],
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying by state
cocktailSchema.index({ availableStates: 1, isActive: 1 });

// Pre-save middleware to handle image compatibility
cocktailSchema.pre('save', function(next) {
  // If images array exists and has items, set the primary image
  if (this.images && this.images.length > 0) {
    // Find primary image or use first image as primary
    const primaryImage = this.images.find(img => img.isPrimary) || this.images[0];
    
    // Set the image field for backward compatibility
    this.image = {
      public_id: primaryImage.public_id,
      url: primaryImage.url
    };
    
    // Ensure only one primary image
    this.images.forEach((img, index) => {
      img.isPrimary = (index === 0 && !this.images.some(i => i.isPrimary)) || img.isPrimary;
    });
  }
  
  next();
});

module.exports = mongoose.model('Cocktail', cocktailSchema);
