/**
 * Inventory Management Example
 * 
 * This example demonstrates the inventory management system with
 * low stock alerts and email notifications.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function inventoryManagementExample() {
  try {
    console.log('📦 Inventory Management Example');
    console.log('==============================\n');

    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@cocktail.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Admin login successful\n');

    // Step 2: Get inventory overview
    console.log('2. Getting inventory overview...');
    const inventoryResponse = await axios.get(`${BASE_URL}/inventory?limit=10`, { headers });
    const inventory = inventoryResponse.data;
    
    console.log('📊 Inventory Overview:');
    console.log(`   Total Items: ${inventory.summary.totalItems}`);
    console.log(`   Low Stock: ${inventory.summary.lowStock}`);
    console.log(`   Critical Stock: ${inventory.summary.criticalStock}`);
    console.log(`   Out of Stock: ${inventory.summary.outOfStock}`);
    console.log('');

    // Step 3: Get low stock items
    console.log('3. Getting low stock items...');
    const lowStockResponse = await axios.get(`${BASE_URL}/inventory?lowStock=true`, { headers });
    const lowStockItems = lowStockResponse.data.inventory;
    
    console.log(`⚠️  Found ${lowStockItems.length} low stock items:`);
    lowStockItems.forEach(item => {
      console.log(`   - ${item.cocktail.name}: ${item.currentStock} ${item.unit} (min: ${item.minimumStock})`);
      console.log(`     Status: ${item.stockStatus}, Alert Threshold: ${item.alertSettings.alertThreshold}`);
    });
    console.log('');

    // Step 4: Get critical stock items
    console.log('4. Getting critical stock items...');
    const criticalStockResponse = await axios.get(`${BASE_URL}/inventory?criticalStock=true`, { headers });
    const criticalStockItems = criticalStockResponse.data.inventory;
    
    console.log(`🚨 Found ${criticalStockItems.length} critical stock items:`);
    criticalStockItems.forEach(item => {
      console.log(`   - ${item.cocktail.name}: ${item.currentStock} ${item.unit} (threshold: ${item.alertSettings.alertThreshold})`);
      console.log(`     Alert Frequency: ${item.alertSettings.frequency}`);
    });
    console.log('');

    if (inventory.inventory.length > 0) {
      const firstItem = inventory.inventory[0];
      
      // Step 5: Restock an item
      console.log('5. Restocking an inventory item...');
      const restockData = {
        quantity: 20,
        cost: 5000,
        notes: 'Emergency restock to maintain service quality'
      };

      const restockResponse = await axios.post(
        `${BASE_URL}/inventory/${firstItem._id}/restock`,
        restockData,
        { headers }
      );

      console.log('✅ Restock completed successfully!');
      console.log(`   Item: ${firstItem.cocktail.name}`);
      console.log(`   Previous Stock: ${restockResponse.data.restockInfo.previousStock} ${firstItem.unit}`);
      console.log(`   Added: ${restockResponse.data.restockInfo.quantityAdded} ${firstItem.unit}`);
      console.log(`   New Stock: ${restockResponse.data.restockInfo.newStock} ${firstItem.unit}`);
      console.log(`   Total Cost: ₦${restockResponse.data.restockInfo.totalCost}`);
      console.log('');

      // Step 6: Update alert settings
      console.log('6. Updating alert settings...');
      const alertUpdateData = {
        alertSettings: {
          isEnabled: true,
          frequency: 'daily',
          alertThreshold: 5
        }
      };

      const updateResponse = await axios.put(
        `${BASE_URL}/inventory/${firstItem._id}`,
        alertUpdateData,
        { headers }
      );

      console.log('✅ Alert settings updated!');
      console.log(`   Frequency: ${updateResponse.data.inventory.alertSettings.frequency}`);
      console.log(`   Alert Threshold: ${updateResponse.data.inventory.alertSettings.alertThreshold}`);
      console.log('');
    }

    // Step 7: Generate inventory report
    console.log('7. Generating inventory report...');
    const reportResponse = await axios.get(`${BASE_URL}/inventory/report`, { headers });
    const report = reportResponse.data.report;
    
    console.log('📊 Detailed Inventory Report:');
    console.log(`   Generated: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`   Total Items: ${report.summary.totalItems}`);
    console.log(`   Low Stock: ${report.summary.lowStock}`);
    console.log(`   Critical Stock: ${report.summary.criticalStock}`);
    console.log(`   Out of Stock: ${report.summary.outOfStock}`);
    console.log('');

    // Step 8: Manually trigger inventory alerts check
    console.log('8. Manually triggering inventory alerts check...');
    const alertsResponse = await axios.post(`${BASE_URL}/inventory/check-alerts`, {}, { headers });
    
    console.log('✅ Inventory alerts check completed!');
    console.log(`   ${alertsResponse.data.message}`);
    console.log('');

    // Step 9: Test order processing with inventory
    console.log('9. Testing order processing with inventory...');
    
    // First, get available cocktails
    const catalogResponse = await axios.get(`${BASE_URL}/catalog?state=Lagos&limit=2`);
    const cocktails = catalogResponse.data.cocktails;
    
    if (cocktails.length > 0) {
      // Create a test order
      const orderData = {
        customer: {
          name: 'Test Customer',
          phone: '+2348012345678',
          address: '123 Test Street, Lagos',
          state: 'Lagos'
        },
        items: [
          {
            cocktail: cocktails[0]._id,
            quantity: 1
          }
        ],
        idempotencyKey: `test-order-${Date.now()}`,
        notes: 'Test order for inventory processing'
      };

      const orderResponse = await axios.post(`${BASE_URL}/orders`, orderData);
      
      console.log('✅ Test order created successfully!');
      console.log(`   Order Number: ${orderResponse.data.orderNumber}`);
      console.log(`   Items: ${orderResponse.data.order.items.length}`);
      console.log('   Inventory has been automatically updated');
      console.log('');
    }

    console.log('🎉 Inventory management example completed!');
    console.log('\nKey features demonstrated:');
    console.log('- Inventory overview and filtering');
    console.log('- Low stock and critical stock monitoring');
    console.log('- Restocking with cost tracking');
    console.log('- Alert settings configuration');
    console.log('- Inventory report generation');
    console.log('- Manual inventory alerts triggering');
    console.log('- Automatic inventory processing with orders');
    console.log('- Email notifications for low stock');

    console.log('\n📧 Email Features:');
    console.log('- Low stock alerts sent to admins');
    console.log('- Critical stock immediate notifications');
    console.log('- Configurable alert frequency (immediate, daily, weekly, monthly)');
    console.log('- Inventory reports via email');
    console.log('- Gmail SMTP integration');

  } catch (error) {
    console.error('❌ Error in inventory management example:', error.response?.data || error.message);
  }
}

// Run the example
if (require.main === module) {
  inventoryManagementExample();
}

module.exports = inventoryManagementExample;
