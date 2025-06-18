# Rental Website Backend

A comprehensive backend API for a rental marketplace that connects equipment owners with renters. Built with Node.js, Express, and MongoDB.

## 🚀 Features

### Authentication & User Management
- User registration with email verification
- Secure login with JWT authentication
- Password reset functionality
- User profile management
- Rate limiting for security

### Listings Management
- Create, read, update, delete listings
- Image upload with Cloudinary integration
- User-specific listing management
- Advanced listing search and filtering

### Shopping & Orders
- Shopping cart functionality
- Order management system
- Order history and tracking

### Rating & Reviews
- Dual rating system for owners and renters
- Review management
- Rating analytics

### Additional Features
- Favorites/Wishlist system
- Real-time notifications
- Admin dashboard
- Email notifications
- File upload handling

## 🛠 Technologies Used

- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **Cloudinary** - Image storage
- **Nodemailer** - Email service
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Express Rate Limit** - Rate limiting
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account (for image storage)
- Email service credentials (Gmail/SMTP)

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rentalWebsiteBack-end
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database
   MONGO_URI=mongodb://localhost:27017/rental-website
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   
   # Email Configuration
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The server will be running at `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/request-verification` | Request verification code for signup | No |
| POST | `/api/verify-signup` | Verify code and complete signup | No |
| POST | `/api/resend-code` | Resend verification code | No |
| POST | `/api/login` | User login | No |
| POST | `/api/forgot-password` | Request password reset | No |
| POST | `/api/reset-password` | Reset password with code | No |
| GET | `/api/profile` | Get user profile | Yes |

### Listings Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/listings` | Get all listings | No |
| POST | `/api/listings` | Create new listing | Yes |
| GET | `/api/listings/user` | Get user's listings | Yes |
| GET | `/api/listings/:id` | Get listing by ID | No |
| PUT | `/api/listings/:id` | Update listing | Yes |
| DELETE | `/api/listings/:id` | Delete listing | Yes |

### Cart Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/cart` | Get user's cart | Yes |
| POST | `/api/cart` | Add item to cart | Yes |
| PUT | `/api/cart/:id` | Update cart item | Yes |
| DELETE | `/api/cart/:id` | Remove item from cart | Yes |

### Order Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/orders` | Get user's orders | Yes |
| POST | `/api/orders` | Create new order | Yes |
| GET | `/api/orders/:id` | Get order by ID | Yes |
| PUT | `/api/orders/:id` | Update order status | Yes |

### Favorites Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/favorites` | Get user's favorites | Yes |
| POST | `/api/favorites` | Add to favorites | Yes |
| DELETE | `/api/favorites/:id` | Remove from favorites | Yes |

### Rating Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/ratings` | Get ratings | Yes |
| POST | `/api/ratings` | Create rating | Yes |
| GET | `/api/owner-ratings` | Get owner ratings | Yes |
| POST | `/api/owner-ratings` | Rate owner | Yes |
| GET | `/api/renter-ratings` | Get renter ratings | Yes |
| POST | `/api/renter-ratings` | Rate renter | Yes |

### Notification Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/notifications` | Get user notifications | Yes |
| POST | `/api/notifications` | Create notification | Yes |
| PUT | `/api/notifications/:id` | Mark as read | Yes |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/*` | Various admin operations | Yes (Admin) |

## 🗂 Project Structure

```
rentalWebsiteBack-end/
├── config/
│   ├── cloudinary.js          # Cloudinary configuration
│   └── emailService.js        # Email service setup
├── Controllers/
│   ├── adminController.js     # Admin operations
│   ├── cartController.js      # Shopping cart logic
│   ├── favoriteController.js  # Favorites management
│   ├── ListingController.js   # Listings CRUD
│   ├── notificationController.js # Notifications
│   ├── orderController.js     # Order management
│   ├── ownerRatingController.js # Owner ratings
│   ├── ratingController.js    # General ratings
│   ├── renterRatingController.js # Renter ratings
│   └── userController.js      # User management
├── middleware/
│   ├── admin.middleware.js    # Admin authentication
│   ├── auth.middleware.js     # JWT verification
│   ├── checkOwnership.js      # Resource ownership check
│   ├── favoriteMiddleware.js  # Favorites middleware
│   ├── rateLimiter.middleware.js # Rate limiting
│   ├── upload.js              # File upload handling
│   └── validator.middleware.js # Input validation
├── Models/
│   ├── Cart.js                # Cart model
│   ├── favorite.js            # Favorite model
│   ├── Listing.js             # Listing model
│   ├── Notification.js        # Notification model
│   ├── Order.js               # Order model
│   ├── OwnerRating.js         # Owner rating model
│   ├── PendingUser.js         # Pending user verification
│   ├── Rating.js              # Rating model
│   ├── RenterRating.js        # Renter rating model
│   └── userModel.js           # User model
├── routes/
│   └── [various route files]  # API route definitions
├── db.js                      # Database connection
├── server.js                  # Main server file
└── package.json               # Dependencies and scripts
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- CORS configuration
- Environment variable protection

## 🚦 Development

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (currently not implemented)

### Environment Variables

Make sure to set up all required environment variables before running the application. The server will not start without proper MongoDB and JWT configuration.

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🤝 Support

For support and questions, please open an issue in the repository.

## 🔄 Version

Current version: 1.0.0

---

**Note**: This is a backend API server. You'll need a corresponding frontend application to interact with these endpoints.