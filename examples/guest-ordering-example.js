/**
 * Guest Ordering Example
 * 
 * This example shows how to place an order as a guest (no signup required)
 * and track the order using the API endpoints.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function guestOrderingExample() {
  try {
    console.log('🍹 Guest Ordering Example');
    console.log('========================\n');

    // Step 1: Browse cocktails available in Lagos
    console.log('1. Browsing cocktails in Lagos...');
    const catalogResponse = await axios.get(`${BASE_URL}/catalog?state=Lagos&limit=5`);
    const cocktails = catalogResponse.data.cocktails;
    
    console.log(`Found ${cocktails.length} cocktails in Lagos:`);
    cocktails.forEach(cocktail => {
      console.log(`  - ${cocktail.name}: ₦${cocktail.price} (${cocktail.description})`);
    });
    console.log('');

    // Step 2: Create an order (Guest ordering - no signup required)
    console.log('2. Creating order...');
    const orderData = {
      customer: {
        name: 'John Doe',
        phone: '+2348012345678',
        address: '123 Victoria Island, Lagos',
        state: 'Lagos'
      },
      items: [
        {
          cocktail: cocktails[0]._id,
          quantity: 2
        },
        {
          cocktail: cocktails[1]._id,
          quantity: 1
        }
      ],
      idempotencyKey: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      notes: 'Please call before delivery'
    };

    const orderResponse = await axios.post(`${BASE_URL}/orders`, orderData);
    const order = orderResponse.data;
    
    console.log(`✅ Order created successfully!`);
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(`   Total Amount: ₦${order.order.totalAmount}`);
    console.log(`   Tracking URL: ${order.trackingUrl}`);
    console.log('');

    // Step 3: Track the order using order number
    console.log('3. Tracking order by order number...');
    const trackingResponse = await axios.get(`${BASE_URL}/orders/${order.orderNumber}`);
    const trackingData = trackingResponse.data;
    
    console.log(`Order Status: ${trackingData.trackingInfo.status}`);
    console.log(`Payment Status: ${trackingData.trackingInfo.paymentStatus}`);
    console.log(`Estimated Delivery: ${new Date(trackingData.trackingInfo.estimatedDelivery).toLocaleString()}`);
    console.log('');

    // Step 4: Track all orders by phone number
    console.log('4. Tracking all orders by phone number...');
    const phoneTrackingResponse = await axios.get(`${BASE_URL}/orders/track/phone/${orderData.customer.phone}`);
    const phoneTrackingData = phoneTrackingResponse.data;
    
    console.log(`Customer: ${phoneTrackingData.customerInfo.name}`);
    console.log(`Total Orders: ${phoneTrackingData.customerInfo.totalOrders}`);
    console.log(`Orders:`);
    phoneTrackingData.orders.forEach(order => {
      console.log(`  - ${order.orderNumber}: ${order.fulfillmentStatus} (₦${order.totalAmount})`);
    });
    console.log('');

    // Step 5: Use the dedicated tracking endpoint for detailed info
    console.log('5. Getting detailed tracking information...');
    const detailedTrackingResponse = await axios.get(`${BASE_URL}/tracking/order/${order.orderNumber}`);
    const detailedTracking = detailedTrackingResponse.data;
    
    console.log(`Detailed Tracking for ${detailedTracking.orderNumber}:`);
    console.log(`  Status: ${detailedTracking.tracking.status}`);
    console.log(`  Progress: ${JSON.stringify(detailedTracking.tracking.orderProgress, null, 2)}`);
    console.log(`  Timeline:`);
    detailedTracking.tracking.timeline.forEach(event => {
      console.log(`    - ${event.status}: ${event.description} (${new Date(event.timestamp).toLocaleString()})`);
    });
    console.log('');

    // Step 6: Initialize payment (example)
    console.log('6. Initializing payment...');
    const paymentData = {
      orderId: order.order._id,
      email: 'customer@example.com',
      callbackUrl: 'http://localhost:3000/payment-callback'
    };

    try {
      const paymentResponse = await axios.post(`${BASE_URL}/payments/initialize`, paymentData);
      console.log(`✅ Payment initialized successfully!`);
      console.log(`   Payment URL: ${paymentResponse.data.payment.authorizationUrl}`);
      console.log(`   Reference: ${paymentResponse.data.payment.reference}`);
    } catch (paymentError) {
      console.log(`⚠️  Payment initialization failed (this is expected in demo mode)`);
      console.log(`   Error: ${paymentError.response?.data?.message || paymentError.message}`);
    }

    console.log('\n🎉 Guest ordering example completed!');
    console.log('\nKey takeaways:');
    console.log('- No signup required for ordering');
    console.log('- Use order number to track orders');
    console.log('- Use phone number to see all customer orders');
    console.log('- Detailed tracking with timeline and progress');
    console.log('- Idempotency keys prevent duplicate orders');

  } catch (error) {
    console.error('❌ Error in guest ordering example:', error.response?.data || error.message);
  }
}

// Run the example
if (require.main === module) {
  guestOrderingExample();
}

module.exports = guestOrderingExample;
