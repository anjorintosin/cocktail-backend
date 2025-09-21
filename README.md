# Cocktail Ordering System Backend

A complete backend API for a cocktail ordering system built with Express.js, Node.js, and MongoDB. Features JWT authentication, Paystack payment integration, Cloudinary image uploads, and comprehensive admin management.

## Features

- **JWT Authentication**: Secure admin authentication with register/login endpoints
- **Cocktail Catalog**: Public browsing by Nigerian state, admin CRUD operations
- **Order Management**: Guest order placement with idempotency keys, admin order management
- **Payment Processing**: Paystack integration for payment initialization, verification, and webhooks
- **Image Upload**: Cloudinary integration for cocktail images
- **Admin Dashboard**: Comprehensive statistics and management tools
- **API Documentation**: Complete Swagger documentation at `/docs`
- **Security**: CORS, Helmet, rate limiting, input validation
- **Modular Architecture**: Clean separation of concerns with organized routes, models, and middleware

## Tech Stack

- **Backend**: Express.js, Node.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Payment**: Paystack API
- **Image Storage**: Cloudinary
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, CORS, express-rate-limit, express-validator

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account
- Paystack account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cock-tail
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=3000
   BASE_URL=http://localhost:3000
   MONGO_URI=mongodb://localhost:27017/cocktail-ordering
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
   PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   NODE_ENV=development
   ```

4. **Seed the database**
   ```bash
   npm run seed
   npm run seed-inventory
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the API**
   - API Base URL: `http://localhost:3000`
   - Swagger Documentation: `http://localhost:3000/docs`
   - Health Check: `http://localhost:3000/health`

## API Endpoints

### Authentication (Public)
- `POST /auth/register` - Register admin user
- `POST /auth/login` - Login admin user
- `GET /auth/me` - Get current user profile

### Catalog (Mixed)
- `GET /catalog?state=Lagos` - Get cocktails by state (Public)
- `GET /catalog/:id` - Get specific cocktail (Public)
- `POST /catalog` - Create cocktail (Admin)
- `PUT /catalog/:id` - Update cocktail (Admin)
- `DELETE /catalog/:id` - Delete cocktail (Admin)

### Orders (Mixed)
- `POST /orders` - Create order (Public - Guest ordering, no signup required)
- `GET /orders/:orderNumber` - Get order by number with tracking info (Public)
- `GET /orders/track/phone/:phone` - Track all orders by phone number (Public)
- `GET /orders` - List all orders with filters (Admin)
- `PATCH /orders/:id/status` - Update order status (Admin)

### Order Tracking (Public)
- `GET /tracking/order/:orderNumber` - Detailed order tracking with timeline (Public)
- `GET /tracking/customer/:phone` - Customer order history by phone (Public)

### Payments (Mixed)
- `POST /payments/initialize` - Initialize payment (Public)
- `GET /payments/verify/:reference` - Verify payment (Public)
- `POST /payments/webhook` - Paystack webhook (Internal)
- `GET /payments` - List payments with filters (Admin)

### Admin Dashboard
- `GET /admin/dashboard` - Get dashboard statistics
- `GET /admin/orders` - Advanced order management
- `GET /admin/cocktails` - Advanced cocktail management
- `GET /admin/payments` - Advanced payment management

### Inventory Management (Admin only)
- `GET /inventory` - Get inventory items with filtering
- `POST /inventory` - Create inventory item for cocktail
- `POST /inventory/:id/restock` - Restock inventory item
- `PUT /inventory/:id` - Update inventory settings
- `GET /inventory/report` - Generate inventory report
- `POST /inventory/check-alerts` - Manually trigger stock alerts

## Authentication

All admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Default Admin Credentials (after seeding)
- Email: `admin@cocktail.com`
- Password: `admin123`

## Nigerian States

The system supports all 36 Nigerian states plus FCT:
Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara

## Order Flow (Guest Ordering - No Signup Required)

1. **Browse Cocktails**: `GET /catalog?state=Lagos`
2. **Create Order**: `POST /orders` with idempotency key (receive order number)
3. **Track Order**: `GET /orders/:orderNumber` or `GET /tracking/order/:orderNumber`
4. **Initialize Payment**: `POST /payments/initialize`
5. **Process Payment**: Redirect customer to Paystack
6. **Verify Payment**: `GET /payments/verify/:reference`
7. **Order Fulfillment**: Admin updates status via `PATCH /orders/:id/status`
8. **Customer Tracking**: `GET /tracking/customer/:phone` to see all orders

### Order Tracking Features
- **Order Status**: Track order progress (new → preparing → delivered)
- **Payment Status**: Monitor payment (pending → paid/failed)
- **Timeline**: See order history with timestamps
- **Estimated Delivery**: Get delivery time estimates
- **Phone Tracking**: View all orders by phone number

## Sample Data

The seed scripts create:
- 1 admin user
- 12 sample cocktails distributed across Nigerian states
- Each cocktail has unique Nigerian state availability
- Complete inventory system with varying stock levels
- Low stock and critical stock items for testing alerts
- Supplier information and cost tracking

## Project Structure

```
cock-tail/
├── config/
│   └── swagger.js          # Swagger configuration
├── middleware/
│   ├── auth.js            # JWT authentication middleware
│   ├── validation.js      # Input validation middleware
│   └── upload.js          # Cloudinary upload middleware
├── models/
│   ├── User.js            # User model
│   ├── Cocktail.js        # Cocktail model
│   ├── Order.js           # Order model
│   ├── Payment.js         # Payment model
│   ├── OTP.js             # OTP model for email validation
│   └── Inventory.js       # Inventory model
├── services/
│   ├── emailService.js    # Gmail SMTP email service
│   └── inventoryAlertService.js # Inventory monitoring service
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── catalog.js         # Catalog routes
│   ├── orders.js          # Order routes
│   ├── payments.js        # Payment routes
│   ├── tracking.js        # Order tracking routes
│   ├── emailValidation.js # Email validation routes
│   ├── inventory.js       # Inventory management routes
│   └── admin.js           # Admin routes
├── scripts/
│   ├── seed.js            # Database seeding script
│   └── seedInventory.js   # Inventory seeding script
├── examples/
│   ├── guest-ordering-example.js      # Guest ordering example
│   ├── admin-tracking-example.js      # Admin tracking example
│   └── inventory-management-example.js # Inventory management example
├── server.js              # Main application file
├── package.json           # Dependencies and scripts
├── env.example            # Environment variables template
└── README.md              # This file
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `BASE_URL` | Base URL for callbacks | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | No (default: 7d) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | Yes |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure production MongoDB URI
4. Set up proper CORS origins
5. Configure Paystack production keys
6. Set up Cloudinary production account
7. Configure webhook URLs for Paystack
8. Set up SSL certificates
9. Configure reverse proxy (nginx)
10. Set up monitoring and logging

## API Documentation

Complete API documentation is available at `/docs` when the server is running. The documentation includes:

- All endpoints with request/response schemas
- Authentication requirements
- Example requests and responses
- Error handling
- Validation rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@example.com or create an issue in the repository.
