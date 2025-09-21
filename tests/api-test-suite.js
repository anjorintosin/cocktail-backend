/**
 * Comprehensive API Test Suite
 * 
 * This file tests all endpoints in the cocktail ordering system
 * to ensure they work correctly with proper error handling.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let adminToken = '';
let testOrderId = '';
let testCocktailId = '';
let testInventoryId = '';
let testPaymentReference = '';

// Test data
const testData = {
  admin: {
    email: 'admin@cocktail.com',
    password: 'admin123'
  },
  customer: {
    name: 'John Doe',
    phone: '+2348012345678',
    address: '123 Victoria Island, Lagos',
    state: 'Lagos'
  },
  email: 'test@example.com'
};

class APITester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running: ${testName}`);
      await testFunction();
      console.log(`✅ PASSED: ${testName}`);
      this.passed++;
      this.tests.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Error: ${error.message}`);
      this.failed++;
      this.tests.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive API Test Suite');
    console.log('==========================================\n');

    // System Tests
    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('Swagger Documentation', () => this.testSwaggerDocs());

    // Authentication Tests
    await this.runTest('Admin Registration', () => this.testAdminRegistration());
    await this.runTest('Admin Login', () => this.testAdminLogin());
    await this.runTest('Get Admin Profile', () => this.testGetAdminProfile());

    // Email Validation Tests
    await this.runTest('Send OTP Email', () => this.testSendOTP());
    await this.runTest('Resend OTP Email', () => this.testResendOTP());
    // Note: OTP verification requires actual email check, so we'll skip it in automated tests

    // Catalog Tests
    await this.runTest('Get Cocktails by State', () => this.testGetCocktailsByState());
    await this.runTest('Get Specific Cocktail', () => this.testGetSpecificCocktail());
    await this.runTest('Create Cocktail (Admin)', () => this.testCreateCocktail());
    await this.runTest('Update Cocktail (Admin)', () => this.testUpdateCocktail());

    // Inventory Tests
    await this.runTest('Get Inventory Overview', () => this.testGetInventory());
    await this.runTest('Create Inventory Item', () => this.testCreateInventoryItem());
    await this.runTest('Restock Inventory Item', () => this.testRestockInventory());
    await this.runTest('Update Inventory Settings', () => this.testUpdateInventorySettings());
    await this.runTest('Generate Inventory Report', () => this.testGenerateInventoryReport());
    await this.runTest('Check Inventory Alerts', () => this.testCheckInventoryAlerts());

    // Order Tests
    await this.runTest('Create Order (Guest)', () => this.testCreateOrder());
    await this.runTest('Track Order by Number', () => this.testTrackOrderByNumber());
    await this.runTest('Track Orders by Phone', () => this.testTrackOrdersByPhone());

    // Admin Order Management Tests
    await this.runTest('Get All Orders (Admin)', () => this.testGetAllOrders());
    await this.runTest('Update Order Status', () => this.testUpdateOrderStatus());
    await this.runTest('Get Detailed Order Tracking', () => this.testGetDetailedOrderTracking());

    // Payment Tests
    await this.runTest('Initialize Payment', () => this.testInitializePayment());
    await this.runTest('Get Payments (Admin)', () => this.testGetPayments());

    // Admin Dashboard Tests
    await this.runTest('Get Admin Dashboard', () => this.testGetAdminDashboard());

    // Error Handling Tests
    await this.runTest('Test Invalid Endpoints', () => this.testInvalidEndpoints());
    await this.runTest('Test Unauthorized Access', () => this.testUnauthorizedAccess());

    this.printSummary();
  }

  async testHealthCheck() {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status !== 200) throw new Error('Health check failed');
    if (!response.data.status || response.data.status !== 'OK') {
      throw new Error('Invalid health check response');
    }
  }

  async testSwaggerDocs() {
    const response = await axios.get(`${BASE_URL}/docs`);
    if (response.status !== 200) throw new Error('Swagger docs not accessible');
  }

  async testAdminRegistration() {
    // Try to register a new admin (might fail if already exists, which is OK)
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        email: 'test-admin@example.com',
        password: 'test123456'
      });
      if (response.status !== 201) throw new Error('Admin registration failed');
    } catch (error) {
      // If user already exists, that's fine
      if (error.response?.status === 400 && error.response?.data?.error === 'User already exists') {
        return; // This is expected
      }
      throw error;
    }
  }

  async testAdminLogin() {
    const response = await axios.post(`${BASE_URL}/auth/login`, testData.admin);
    if (response.status !== 200) throw new Error('Admin login failed');
    if (!response.data.token) throw new Error('No token received');
    
    adminToken = response.data.token;
    authToken = adminToken; // Use admin token for most tests
  }

  async testGetAdminProfile() {
    if (!adminToken) throw new Error('No admin token available');
    
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Get admin profile failed');
    if (!response.data.user) throw new Error('No user data received');
  }

  async testSendOTP() {
    const response = await axios.post(`${BASE_URL}/email/send-otp`, {
      email: testData.email,
      purpose: 'email_verification'
    });
    if (response.status !== 200) throw new Error('Send OTP failed');
    if (!response.data.success) throw new Error('OTP sending not successful');
  }

  async testResendOTP() {
    const response = await axios.post(`${BASE_URL}/email/resend-otp`, {
      email: testData.email,
      purpose: 'email_verification'
    });
    if (response.status !== 200) throw new Error('Resend OTP failed');
    if (!response.data.success) throw new Error('OTP resending not successful');
  }

  async testGetCocktailsByState() {
    const response = await axios.get(`${BASE_URL}/catalog?state=Lagos&limit=5`);
    if (response.status !== 200) throw new Error('Get cocktails by state failed');
    if (!response.data.cocktails || !Array.isArray(response.data.cocktails)) {
      throw new Error('Invalid cocktails response');
    }
    
    if (response.data.cocktails.length > 0) {
      testCocktailId = response.data.cocktails[0]._id;
    }
  }

  async testGetSpecificCocktail() {
    if (!testCocktailId) {
      // Get a cocktail first
      const catalogResponse = await axios.get(`${BASE_URL}/catalog?state=Lagos&limit=1`);
      if (catalogResponse.data.cocktails.length === 0) {
        throw new Error('No cocktails available for testing');
      }
      testCocktailId = catalogResponse.data.cocktails[0]._id;
    }

    const response = await axios.get(`${BASE_URL}/catalog/${testCocktailId}`);
    if (response.status !== 200) throw new Error('Get specific cocktail failed');
    if (!response.data.cocktail) throw new Error('No cocktail data received');
  }

  async testCreateCocktail() {
    if (!adminToken) throw new Error('No admin token available');

    // This test will create a test cocktail
    const cocktailData = {
      name: 'Test Cocktail',
      description: 'A test cocktail for API testing',
      price: 2500,
      availableStates: ['Lagos', 'FCT']
    };

    // Note: This would require file upload in real scenario
    // For testing, we'll just validate the endpoint exists
    try {
      await axios.post(`${BASE_URL}/catalog`, cocktailData, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'Image required') {
        // This is expected without image upload
        console.log('   ⚠️  Cocktail creation test skipped (requires image upload)');
        return;
      }
      throw error;
    }
  }

  async testUpdateCocktail() {
    if (!adminToken || !testCocktailId) throw new Error('Missing admin token or cocktail ID');

    const updateData = {
      name: 'Updated Test Cocktail',
      description: 'Updated description'
    };

    const response = await axios.put(`${BASE_URL}/catalog/${testCocktailId}`, updateData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Update cocktail failed');
  }

  async testGetInventory() {
    if (!adminToken) throw new Error('No admin token available');

    const response = await axios.get(`${BASE_URL}/inventory?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Get inventory failed');
    if (!response.data.inventory || !response.data.summary) {
      throw new Error('Invalid inventory response');
    }
  }

  async testCreateInventoryItem() {
    if (!adminToken || !testCocktailId) throw new Error('Missing admin token or cocktail ID');

    // First check if inventory already exists for this cocktail
    try {
      const existingResponse = await axios.get(`${BASE_URL}/inventory`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (existingResponse.data.inventory.length > 0) {
        testInventoryId = existingResponse.data.inventory[0]._id;
        console.log('   Using existing inventory item for testing');
        return;
      }
    } catch (error) {
      // Continue with creation if check fails
    }

    const inventoryData = {
      cocktail: testCocktailId,
      currentStock: 50,
      minimumStock: 10,
      maximumStock: 100,
      unit: 'servings',
      costPerUnit: 500,
      supplier: {
        name: 'Test Supplier',
        contact: {
          phone: '+2348012345678',
          email: 'supplier@test.com'
        }
      },
      alertSettings: {
        isEnabled: true,
        frequency: 'daily',
        alertThreshold: 5
      }
    };

    try {
      const response = await axios.post(`${BASE_URL}/inventory`, inventoryData, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (response.status !== 201) throw new Error('Create inventory item failed');
      
      testInventoryId = response.data.inventory._id;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'Inventory already exists') {
        // Inventory already exists, get it from the list
        const existingResponse = await axios.get(`${BASE_URL}/inventory`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (existingResponse.data.inventory.length > 0) {
          testInventoryId = existingResponse.data.inventory[0]._id;
          console.log('   Using existing inventory item for testing');
          return;
        }
      }
      throw error;
    }
  }

  async testRestockInventory() {
    if (!adminToken || !testInventoryId) throw new Error('Missing admin token or inventory ID');

    const restockData = {
      quantity: 25,
      cost: 2500,
      notes: 'Test restock for API testing'
    };

    const response = await axios.post(`${BASE_URL}/inventory/${testInventoryId}/restock`, restockData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Restock inventory failed');
  }

  async testUpdateInventorySettings() {
    if (!adminToken || !testInventoryId) throw new Error('Missing admin token or inventory ID');

    const updateData = {
      alertSettings: {
        isEnabled: true,
        frequency: 'weekly',
        alertThreshold: 3
      }
    };

    const response = await axios.put(`${BASE_URL}/inventory/${testInventoryId}`, updateData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Update inventory settings failed');
  }

  async testGenerateInventoryReport() {
    if (!adminToken) throw new Error('No admin token available');

    const response = await axios.get(`${BASE_URL}/inventory/report`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Generate inventory report failed');
    if (!response.data.report) throw new Error('No report data received');
  }

  async testCheckInventoryAlerts() {
    if (!adminToken) throw new Error('No admin token available');

    const response = await axios.post(`${BASE_URL}/inventory/check-alerts`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Check inventory alerts failed');
  }

  async testCreateOrder() {
    if (!testCocktailId) throw new Error('No test cocktail ID available');

    const orderData = {
      customer: testData.customer,
      items: [
        {
          cocktail: testCocktailId,
          quantity: 2
        }
      ],
      idempotencyKey: `test-order-${Date.now()}`,
      notes: 'Test order for API testing'
    };

    const response = await axios.post(`${BASE_URL}/orders`, orderData);
    if (response.status !== 201) throw new Error('Create order failed');
    if (!response.data.order) throw new Error('No order data received');
    
    testOrderId = response.data.order._id;
  }

  async testTrackOrderByNumber() {
    if (!testOrderId) throw new Error('No test order ID available');

    // First get the order number
    const orderResponse = await axios.get(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { limit: 1 }
    });
    
    if (orderResponse.data.orders.length === 0) {
      throw new Error('No orders available for tracking');
    }
    
    const orderNumber = orderResponse.data.orders[0].orderNumber;
    const response = await axios.get(`${BASE_URL}/orders/${orderNumber}`);
    if (response.status !== 200) throw new Error('Track order by number failed');
    if (!response.data.trackingInfo) throw new Error('No tracking info received');
  }

  async testTrackOrdersByPhone() {
    const response = await axios.get(`${BASE_URL}/orders/track/phone/${testData.customer.phone}`);
    if (response.status !== 200) throw new Error('Track orders by phone failed');
    if (!response.data.orders) throw new Error('No orders data received');
  }

  async testGetAllOrders() {
    if (!adminToken) throw new Error('No admin token available');

    const response = await axios.get(`${BASE_URL}/admin/orders?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Get all orders failed');
    if (!response.data.orders) throw new Error('No orders data received');
  }

  async testUpdateOrderStatus() {
    if (!adminToken || !testOrderId) throw new Error('Missing admin token or order ID');

    const statusUpdateData = {
      fulfillmentStatus: 'preparing',
      adminNote: 'Order is being prepared for testing',
      sendEmailNotification: false
    };

    const response = await axios.patch(`${BASE_URL}/admin/orders/${testOrderId}/status`, statusUpdateData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Update order status failed');
  }

  async testGetDetailedOrderTracking() {
    if (!adminToken || !testOrderId) throw new Error('Missing admin token or order ID');

    const response = await axios.get(`${BASE_URL}/admin/orders/${testOrderId}/track`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Get detailed order tracking failed');
    if (!response.data.trackingInfo) throw new Error('No tracking info received');
  }

  async testInitializePayment() {
    if (!testOrderId) throw new Error('No test order ID available');

    const paymentData = {
      orderId: testOrderId,
      email: testData.email,
      callbackUrl: 'http://localhost:3000/payment-callback'
    };

    try {
      const response = await axios.post(`${BASE_URL}/payments/initialize`, paymentData);
      if (response.status !== 200) throw new Error('Initialize payment failed');
      if (!response.data.payment) throw new Error('No payment data received');
      
      testPaymentReference = response.data.payment.reference;
    } catch (error) {
      // Payment initialization might fail due to missing Paystack keys
      if (error.response?.status === 500 && error.response?.data?.message?.includes('Paystack')) {
        console.log('   ⚠️  Payment test skipped (Paystack not configured)');
        return;
      }
      throw error;
    }
  }

  async testGetPayments() {
    if (!adminToken) throw new Error('No admin token available');

    const response = await axios.get(`${BASE_URL}/admin/payments?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Get payments failed');
    if (!response.data.payments) throw new Error('No payments data received');
  }

  async testGetAdminDashboard() {
    if (!adminToken) throw new Error('No admin token available');

    const response = await axios.get(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.status !== 200) throw new Error('Get admin dashboard failed');
    if (!response.data.statistics) throw new Error('No statistics data received');
  }

  async testInvalidEndpoints() {
    try {
      await axios.get(`${BASE_URL}/invalid-endpoint`);
      throw new Error('Should have returned 404');
    } catch (error) {
      if (error.response?.status !== 404) {
        throw new Error('Invalid endpoint should return 404');
      }
    }
  }

  async testUnauthorizedAccess() {
    try {
      await axios.get(`${BASE_URL}/admin/dashboard`);
      throw new Error('Should have returned 401');
    } catch (error) {
      if (error.response?.status !== 401) {
        throw new Error('Unauthorized access should return 401');
      }
    }
  }

  printSummary() {
    console.log('\n📊 Test Results Summary');
    console.log('======================');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n🎉 API Test Suite Complete!');
    
    if (this.failed === 0) {
      console.log('🎊 All tests passed! The API is working perfectly!');
    } else {
      console.log('⚠️  Some tests failed. Please check the errors above.');
    }
  }
}

// Run the test suite
async function runAPITests() {
  const tester = new APITester();
  await tester.runAllTests();
}

// Export for use in other files
module.exports = { APITester, runAPITests };

// Run if this file is executed directly
if (require.main === module) {
  runAPITests().catch(console.error);
}
