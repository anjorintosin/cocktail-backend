#!/bin/bash

echo "🍹 Cocktail Ordering System Backend Setup"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from env.example..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before running the server."
    echo ""
    echo "Required configurations:"
    echo "  - MONGO_URI: Your MongoDB connection string"
    echo "  - JWT_SECRET: A strong secret for JWT signing"
    echo "  - PAYSTACK_SECRET_KEY: Your Paystack secret key"
    echo "  - PAYSTACK_PUBLIC_KEY: Your Paystack public key"
    echo "  - CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name"
    echo "  - CLOUDINARY_API_KEY: Your Cloudinary API key"
    echo "  - CLOUDINARY_API_SECRET: Your Cloudinary API secret"
    echo ""
    echo "After configuring .env, run:"
    echo "  npm run seed  # To seed the database"
    echo "  npm run dev   # To start the development server"
    exit 1
fi

echo "✅ .env file found"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies installed"

# Check if database is seeded
echo "🌱 Checking database..."
node -e "
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  const User = require('./models/User');
  const Cocktail = require('./models/Cocktail');
  
  const userCount = await User.countDocuments();
  const cocktailCount = await Cocktail.countDocuments();
  
  if (userCount === 0 || cocktailCount === 0) {
    console.log('⚠️  Database not seeded. Run: npm run seed');
    process.exit(1);
  } else {
    console.log('✅ Database seeded (' + userCount + ' users, ' + cocktailCount + ' cocktails)');
    process.exit(0);
  }
})
.catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🚀 Starting development server..."
    echo "📚 API Documentation: http://localhost:3000/docs"
    echo "🏥 Health Check: http://localhost:3000/health"
    echo ""
    npm run dev
else
    echo ""
    echo "Please run 'npm run seed' to seed the database first."
fi
