/**
 * Admin Order Tracking and Email Validation Example
 * 
 * This example shows how to use the admin order tracking features
 * and email validation with Gmail SMTP integration.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function adminTrackingExample() {
  try {
    console.log('🔧 Admin Tracking & Email Validation Example');
    console.log('==========================================\n');

    // Step 1: Login as admin to get JWT token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@cocktail.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Admin login successful\n');

    // Step 2: Test email validation
    console.log('2. Testing email validation...');
    
    // Send OTP to email
    const emailToValidate = 'test@example.com';
    const sendOTPResponse = await axios.post(`${BASE_URL}/email/send-otp`, {
      email: emailToValidate,
      purpose: 'email_verification'
    });
    
    console.log('✅ OTP sent to email:', emailToValidate);
    console.log('Response:', sendOTPResponse.data.message);
    
    // Note: In real usage, you would get the OTP from the email
    // For demo purposes, we'll skip verification
    console.log('⚠️  In real usage, check email for OTP and verify it\n');

    // Step 3: Get dashboard statistics
    console.log('3. Getting admin dashboard statistics...');
    const dashboardResponse = await axios.get(`${BASE_URL}/admin/dashboard`, { headers });
    const stats = dashboardResponse.data.statistics;
    
    console.log('📊 Dashboard Statistics:');
    console.log(`   Total Orders: ${stats.totalOrders}`);
    console.log(`   Pending Orders: ${stats.pendingOrders}`);
    console.log(`   Paid Orders: ${stats.paidOrders}`);
    console.log(`   Total Revenue: ₦${stats.totalRevenue}`);
    console.log(`   Total Cocktails: ${stats.totalCocktails}`);
    console.log(`   Active Cocktails: ${stats.activeCocktails}`);
    console.log('');

    // Step 4: Get all orders with filtering
    console.log('4. Getting orders with filtering...');
    const ordersResponse = await axios.get(`${BASE_URL}/admin/orders?limit=5`, { headers });
    const orders = ordersResponse.data.orders;
    
    console.log(`📦 Found ${orders.length} orders:`);
    orders.forEach(order => {
      console.log(`   - ${order.orderNumber}: ${order.fulfillmentStatus} (₦${order.totalAmount})`);
    });
    console.log('');

    if (orders.length > 0) {
      const firstOrder = orders[0];
      
      // Step 5: Get detailed tracking for an order
      console.log('5. Getting detailed order tracking...');
      const trackingResponse = await axios.get(`${BASE_URL}/admin/orders/${firstOrder._id}/track`, { headers });
      const trackingInfo = trackingResponse.data.trackingInfo;
      
      console.log(`📋 Tracking Info for ${trackingInfo.orderNumber}:`);
      console.log(`   Status: ${trackingInfo.status}`);
      console.log(`   Payment Status: ${trackingInfo.paymentStatus}`);
      console.log(`   Timeline:`);
      trackingInfo.timeline.forEach(event => {
        console.log(`     ${event.icon} ${event.status}: ${event.description}`);
      });
      console.log('');

      // Step 6: Update order status with email notification
      console.log('6. Updating order status...');
      const statusUpdateData = {
        fulfillmentStatus: 'preparing',
        adminNote: 'Order is being prepared by our expert mixologists',
        sendEmailNotification: true,
        estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      };

      const updateResponse = await axios.patch(
        `${BASE_URL}/admin/orders/${firstOrder._id}/status`,
        statusUpdateData,
        { headers }
      );

      console.log('✅ Order status updated successfully!');
      console.log(`   Previous Status: ${updateResponse.data.statusUpdate.previousStatus}`);
      console.log(`   New Status: ${updateResponse.data.statusUpdate.newStatus}`);
      console.log(`   Email Sent: ${updateResponse.data.emailSent ? 'Yes' : 'No'}`);
      console.log('');

      // Step 7: Update to "in route" status
      console.log('7. Updating order to "in route" status...');
      const inRouteUpdateData = {
        fulfillmentStatus: 'in_route',
        adminNote: 'Order is on the way to your location',
        sendEmailNotification: true
      };

      const inRouteResponse = await axios.patch(
        `${BASE_URL}/admin/orders/${firstOrder._id}/status`,
        inRouteUpdateData,
        { headers }
      );

      console.log('✅ Order status updated to "in route"!');
      console.log(`   Email Sent: ${inRouteResponse.data.emailSent ? 'Yes' : 'No'}`);
      console.log('');

      // Step 8: Final delivery update
      console.log('8. Marking order as delivered...');
      const deliveredUpdateData = {
        fulfillmentStatus: 'delivered',
        adminNote: 'Order delivered successfully. Thank you for choosing us!',
        sendEmailNotification: true
      };

      const deliveredResponse = await axios.patch(
        `${BASE_URL}/admin/orders/${firstOrder._id}/status`,
        deliveredUpdateData,
        { headers }
      );

      console.log('✅ Order marked as delivered!');
      console.log(`   Email Sent: ${deliveredResponse.data.emailSent ? 'Yes' : 'No'}`);
      console.log('');
    }

    // Step 9: Get payments information
    console.log('9. Getting payments information...');
    const paymentsResponse = await axios.get(`${BASE_URL}/admin/payments?limit=5`, { headers });
    const payments = paymentsResponse.data.payments;
    
    console.log(`💳 Found ${payments.length} payments:`);
    payments.forEach(payment => {
      console.log(`   - ${payment.paystackReference}: ${payment.status} (₦${payment.amount / 100})`);
    });

    console.log('\n🎉 Admin tracking example completed!');
    console.log('\nKey features demonstrated:');
    console.log('- Gmail SMTP email validation with OTP');
    console.log('- Admin order status updates with email notifications');
    console.log('- Comprehensive order tracking with timeline');
    console.log('- Admin notes and estimated delivery times');
    console.log('- Dashboard statistics and filtering');

  } catch (error) {
    console.error('❌ Error in admin tracking example:', error.response?.data || error.message);
  }
}

// Run the example
if (require.main === module) {
  adminTrackingExample();
}

module.exports = adminTrackingExample;
