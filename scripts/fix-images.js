const mongoose = require('mongoose');
require('dotenv').config();

const Cocktail = require('../models/Cocktail');

async function fixImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all cocktails
    const cocktails = await Cocktail.find({});
    console.log(`Found ${cocktails.length} cocktails to fix`);

    let fixedCount = 0;
    
    for (const cocktail of cocktails) {
      if (cocktail.images && cocktail.images.length > 0) {
        // Find primary image or use first image as primary
        const primaryImage = cocktail.images.find(img => img.isPrimary) || cocktail.images[0];
        
        // Set the image field for backward compatibility
        cocktail.image = {
          public_id: primaryImage.public_id,
          url: primaryImage.url
        };
        
        // Ensure only one primary image
        cocktail.images.forEach((img, index) => {
          img.isPrimary = (index === 0 && !cocktail.images.some(i => i.isPrimary)) || img.isPrimary;
        });
        
        await cocktail.save();
        fixedCount++;
        console.log(`✅ Fixed ${cocktail.name} - Primary image: ${primaryImage.public_id}`);
      }
    }

    console.log(`\n🎉 Fixed ${fixedCount} cocktails with image compatibility`);
    console.log('All cocktails now have both images array and image field for backward compatibility');

  } catch (error) {
    console.error('❌ Error fixing images:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the fix function
fixImages();
