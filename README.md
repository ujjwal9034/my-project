# 🥬 FreshMarket — Local Grocery Marketplace

A full-stack grocery marketplace connecting local sellers with customers. Built with **Node.js/Express/TypeScript** backend and **Next.js/React** frontend.

## ✨ Features

### For Customers
- 🛒 Browse & search products with category filtering and sorting
- ❤️ Wishlist system (save favorites)
- 📦 Order tracking with real-time status updates
- 💳 Multiple payment methods (Card, UPI, Cash on Delivery)
- 📍 Address book (save multiple delivery addresses)
- ⭐ Product reviews and ratings
- 🔒 Secure password management with strength validation

### For Sellers
- 📊 Seller dashboard with sales analytics
- 📦 Product management (create, edit, delete with image upload)
- 🚚 Order fulfillment (update order status)
- 📈 Revenue tracking

### For Admins
- 👥 User management (ban/unban, delete users)
- ✅ Seller approval workflow
- 📊 Analytics dashboard (revenue, users, orders)
- 📦 All-orders management view

### Security
- 🔐 JWT authentication with httpOnly cookies
- 🛡️ Rate limiting (API, auth, sensitive operations)
- 🪖 Helmet security headers
- ✅ Input validation on all endpoints
- 🔒 Password hashing (bcrypt 12 rounds)
- 🚫 Account lockout after failed login attempts
- 🔍 Role-based access control (Customer/Seller/Admin)

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Clone and install

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Copy the example env file
cp backend/.env.example backend/.env
# The .env comes pre-configured for development
```

### 3. Seed the admin account

```bash
cd backend
npm run seed:admin
```

This creates an admin user:
- **Email:** `admin@freshmarket.com`
- **Password:** `Admin@12345`

### 4. Start the servers

```bash
# Terminal 1 — Backend (port 5001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Open **http://localhost:3000** 🎉

---

## 🌐 Production Deployment

### Option A: Deploy on Render / Railway

#### Backend

1. **Create MongoDB Atlas cluster** (free at https://cloud.mongodb.com)
2. Set these environment variables on your hosting platform:

```env
NODE_ENV=production
PORT=5001
JWT_SECRET=<generate-a-64-char-random-string>
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/freshmarket
FRONTEND_URL=https://your-frontend-domain.com
```

3. **Build command:** `npm run build`
4. **Start command:** `npm start`

#### Frontend

1. Set environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

2. **Build command:** `npm run build`
3. **Start command:** `npm start`

### Option B: Deploy on VPS (DigitalOcean, AWS EC2, etc.)

```bash
# On the server
git clone <your-repo-url>
cd freshmarket

# Backend
cd backend
cp .env.example .env
# Edit .env with production values
npm install --production
npm run build
npm run seed:admin

# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name freshmarket-api

# Frontend
cd ../frontend
echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.com" > .env.local
npm install
npm run build
pm2 start npm --name freshmarket-web -- start
```

---

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/         # DB & upload configuration
│   │   ├── controllers/    # Route handlers
│   │   ├── middlewares/     # Auth, validation, rate limiting
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API route definitions
│   │   ├── scripts/         # Admin seeder
│   │   ├── utils/           # JWT token generation
│   │   └── index.ts         # Server entry point
│   ├── uploads/             # Product images (dev only)
│   ├── .env                 # Environment variables
│   └── .env.example         # Template
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # Reusable UI components
│   │   ├── store/           # Zustand state management
│   │   └── utils/           # API client
│   ├── .env.local           # Frontend env variables
│   └── next.config.js       # Next.js configuration
│
└── .gitignore
```

---

## 🔑 API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/users` | Public | Register |
| POST | `/api/users/login` | Public | Login |
| POST | `/api/users/logout` | Public | Logout |
| GET | `/api/users/profile` | Auth | Get profile |
| PUT | `/api/users/profile` | Auth | Update profile |
| DELETE | `/api/users/profile` | Auth | Delete account |
| PUT | `/api/users/change-password` | Auth | Change password |
| POST | `/api/users/addresses` | Auth | Add address |
| DELETE | `/api/users/addresses/:id` | Auth | Remove address |
| GET | `/api/users` | Admin | List all users |
| GET | `/api/users/admin/stats` | Admin | Dashboard stats |
| PUT | `/api/users/:id/approve` | Admin | Approve seller |
| PUT | `/api/users/:id/ban` | Admin | Ban/unban user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| GET | `/api/products` | Public | List products |
| GET | `/api/products/categories` | Public | Get categories |
| GET | `/api/products/:id` | Public | Product details |
| POST | `/api/products` | Seller | Create product |
| PUT | `/api/products/:id` | Seller | Update product |
| DELETE | `/api/products/:id` | Seller | Delete product |
| POST | `/api/products/:id/reviews` | Auth | Add review |
| POST | `/api/orders` | Auth | Create order |
| GET | `/api/orders/myorders` | Auth | My orders |
| GET | `/api/orders` | Admin | All orders |
| GET | `/api/wishlist` | Auth | Get wishlist |
| POST | `/api/wishlist/:productId` | Auth | Add to wishlist |
| DELETE | `/api/wishlist/:productId` | Auth | Remove from wishlist |
| GET | `/api/health` | Public | Health check |

---

## 📝 License

MIT
