const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection with auto-seeding
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Auto-seed database in development
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
    console.log('🌱 Auto-seeding database...');
    try {
      // Check if data already exists
      const User = require('./models/User');
      const Cocktail = require('./models/Cocktail');
      const Inventory = require('./models/Inventory');
      
      const existingUsers = await User.countDocuments();
      const existingCocktails = await Cocktail.countDocuments();
      const existingInventory = await Inventory.countDocuments();
      
      if (existingUsers === 0 || existingCocktails === 0) {
        console.log('📦 Seeding initial data...');
        
        // Seed basic data (admin user and cocktails)
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        await execAsync('npm run seed');
        console.log('✅ Database seeded with admin user and cocktails');
        
        // Seed inventory if no inventory exists
        if (existingInventory === 0) {
          await execAsync('npm run seed-inventory');
          console.log('✅ Database seeded with inventory data');
        }
        
        console.log('🎉 Auto-seeding completed successfully!');
      } else {
        console.log('📊 Database already contains data, skipping auto-seed');
        console.log(`   - Users: ${existingUsers}`);
        console.log(`   - Cocktails: ${existingCocktails}`);
        console.log(`   - Inventory items: ${existingInventory}`);
      }
    } catch (seedError) {
      console.error('❌ Auto-seeding failed:', seedError.message);
      console.log('💡 You can manually seed with: npm run seed && npm run seed-inventory');
    }
  }
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users')); // User registration and management
app.use('/cart', require('./routes/cart')); // Shopping cart management
app.use('/catalog', require('./routes/catalog'));
app.use('/orders', require('./routes/orders'));
app.use('/tracking', require('./routes/tracking'));
app.use('/payments', require('./routes/payments'));
app.use('/email', require('./routes/emailValidation'));
app.use('/inventory', require('./routes/inventory'));
app.use('/admin', require('./routes/admin'));

// Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Cocktail Ordering System'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize inventory alert service
const inventoryAlertService = require('./services/inventoryAlertService');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
  
  // Start periodic inventory checking (every hour)
  inventoryAlertService.startPeriodicCheck(60);
  console.log('📦 Inventory monitoring system started');
});

module.exports = app;
