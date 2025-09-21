const mongoose = require('mongoose');
require('dotenv').config();

const Inventory = require('../models/Inventory');
const Cocktail = require('../models/Cocktail');

async function seedInventory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing inventory data
    await Inventory.deleteMany({});
    console.log('Cleared existing inventory data');

    // Get all cocktails
    const cocktails = await Cocktail.find({ isActive: true });
    console.log(`Found ${cocktails.length} cocktails to create inventory for`);

    // Create inventory for each cocktail with varying stock levels
    const inventoryData = cocktails.map((cocktail, index) => {
      // Vary stock levels for demonstration
      const stockVariations = [
        { current: 5, min: 10, max: 50, status: 'critical' },
        { current: 8, min: 15, max: 75, status: 'low' },
        { current: 25, min: 20, max: 100, status: 'sufficient' },
        { current: 45, min: 30, max: 120, status: 'sufficient' },
        { current: 12, min: 25, max: 80, status: 'low' },
        { current: 3, min: 10, max: 60, status: 'critical' },
        { current: 0, min: 15, max: 90, status: 'out_of_stock' },
        { current: 18, min: 20, max: 100, status: 'sufficient' },
        { current: 7, min: 12, max: 70, status: 'critical' },
        { current: 22, min: 25, max: 110, status: 'sufficient' },
        { current: 35, min: 30, max: 130, status: 'sufficient' },
        { current: 9, min: 15, max: 85, status: 'low' }
      ];

      const variation = stockVariations[index % stockVariations.length];

      return {
        cocktail: cocktail._id,
        currentStock: variation.current,
        minimumStock: variation.min,
        maximumStock: variation.max,
        unit: 'servings',
        costPerUnit: Math.round((cocktail.price * 0.3) + Math.random() * 500), // 30% of cocktail price + random cost
        supplier: {
          name: `Supplier ${String.fromCharCode(65 + (index % 26))}${index + 1}`,
          contact: {
            phone: `+234${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
            email: `supplier${index + 1}@example.com`
          }
        },
        alertSettings: {
          isEnabled: true,
          frequency: ['immediate', 'daily', 'weekly'][index % 3],
          alertThreshold: Math.max(3, Math.floor(variation.min * 0.5))
        },
        lastRestocked: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
      };
    });

    const inventoryItems = await Inventory.insertMany(inventoryData);
    console.log(`✅ Created ${inventoryItems.length} inventory items`);

    // Display inventory summary
    const summary = {
      total: inventoryItems.length,
      critical: inventoryItems.filter(item => item.currentStock <= item.alertSettings.alertThreshold).length,
      low: inventoryItems.filter(item => item.currentStock <= item.minimumStock && item.currentStock > item.alertSettings.alertThreshold).length,
      outOfStock: inventoryItems.filter(item => item.currentStock === 0).length,
      sufficient: inventoryItems.filter(item => item.currentStock > item.minimumStock).length
    };

    console.log('\n📊 Inventory Summary:');
    console.log(`  Total Items: ${summary.total}`);
    console.log(`  Critical Stock: ${summary.critical}`);
    console.log(`  Low Stock: ${summary.low}`);
    console.log(`  Out of Stock: ${summary.outOfStock}`);
    console.log(`  Sufficient Stock: ${summary.sufficient}`);

    console.log('\n🚨 Critical Stock Items:');
    inventoryItems
      .filter(item => item.currentStock <= item.alertSettings.alertThreshold)
      .forEach(item => {
        console.log(`  - ${item.cocktail.name}: ${item.currentStock} servings (threshold: ${item.alertSettings.alertThreshold})`);
      });

    console.log('\n⚠️  Low Stock Items:');
    inventoryItems
      .filter(item => item.currentStock <= item.minimumStock && item.currentStock > item.alertSettings.alertThreshold)
      .forEach(item => {
        console.log(`  - ${item.cocktail.name}: ${item.currentStock} servings (minimum: ${item.minimumStock})`);
      });

    console.log('\n🎉 Inventory seeding completed successfully!');
    console.log('\nThe inventory system will now:');
    console.log('- Monitor stock levels automatically');
    console.log('- Send email alerts for low/critical stock');
    console.log('- Track restock history');
    console.log('- Integrate with order processing');

  } catch (error) {
    console.error('❌ Error seeding inventory:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
if (require.main === module) {
  seedInventory();
}

module.exports = seedInventory;
