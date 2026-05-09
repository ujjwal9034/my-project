import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import bcrypt from 'bcryptjs';
import connectDB from './config/db';
import { apiLimiter } from './middlewares/rateLimiter';

// Global Error Handlers for Production Stability
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Load environment variables FIRST
dotenv.config();

// Validate critical env vars at startup
const requiredEnvVars = ['JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ FATAL: ${envVar} environment variable is not set.`);
    console.error('   Create a .env file with required variables. See .env.example');
    process.exit(1);
  }
}

// Warn about optional but recommended env vars in production
if (process.env.NODE_ENV === 'production') {
  const recommendedVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_EMAIL', 'FRONTEND_URL'];
  for (const envVar of recommendedVars) {
    if (!process.env[envVar]) {
      console.warn(`⚠️  WARNING: ${envVar} is not set. Email features will use console fallback.`);
    }
  }
}

// Database connection will be initialized before starting the server

const app = express();

// Trust proxy required for rate limiter behind reverse proxies (Render, AWS, etc)
app.set('trust proxy', 1);

// HTTP request logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
// Configure CORS properly for cross-origin cookie support
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    // In production, allow the specific frontend URL
    if (allowedOrigin === '*') return callback(null, true);
    // Check if origin matches allowed origin(s)
    const origins = allowedOrigin.split(',').map(o => o.trim());
    if (origins.includes(origin)) return callback(null, true);
    return callback(null, true); // Be permissive — security handled by cookies + CSRF
  },
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compress all responses
app.use(compression());

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// Serve uploaded images statically
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint (for deployment platforms)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'FreshMarket API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Email diagnostic endpoint
app.get('/api/test-email', async (req, res) => {
  const config = {
    SMTP_USER: process.env.SMTP_USER ? `✅ ${process.env.SMTP_USER}` : '❌ NOT SET',
    SMTP_PASS: process.env.SMTP_PASS ? `✅ SET (${process.env.SMTP_PASS.length} chars)` : '❌ NOT SET',
    SMTP_HOST: process.env.SMTP_HOST || '(not needed for Gmail service mode)',
    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '(will use SMTP_USER)',
    FRONTEND_URL: process.env.FRONTEND_URL || '❌ NOT SET',
  };

  // If ?send=1&to=email@example.com is provided, attempt to send a test email
  const sendTo = req.query.to as string;
  const shouldSend = req.query.send === '1' && sendTo;

  if (shouldSend) {
    try {
      const sendEmail = (await import('./utils/sendEmail')).default;
      await sendEmail({
        email: sendTo,
        subject: 'FreshMarket - Test Email ✅',
        message: `This is a test email from FreshMarket!\n\nIf you received this, your email configuration is working correctly.\n\nHere is a test verification code: 123456\n\nSent at: ${new Date().toISOString()}`,
      });
      res.json({ success: true, message: `Test email sent to ${sendTo}`, config });
    } catch (error: any) {
      res.json({ success: false, error: error.message, config });
    }
  } else {
    res.json({ 
      message: 'Email config status. Add ?send=1&to=your@email.com to send a test.',
      config 
    });
  }
});

// Import Routes
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import reportRoutes from './routes/reportRoutes';
import { notFound, errorHandler } from './middlewares/errorMiddleware';

// Use Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reports', reportRoutes);

// Catch-all route to serve index.html for SPA (if it exists)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  import('fs').then(fs => {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ message: 'API Route Not Found' });
    }
  });
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

let server: any;

// ─── Admin Credentials (from env) ───────────────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'ujjwalchauhan599@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Arjun@321';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin';

/**
 * Ensures the hardcoded admin account always exists in the database.
 * - If a user with ADMIN_EMAIL already exists → force role=admin, isBanned=false, isApproved=true.
 * - If no user exists → insert a fresh admin account.
 * The admin can NEVER be banned, warned, or removed by any automated logic.
 */
const ensureAdminAccount = async (): Promise<void> => {
  try {
    // Lazy-import to avoid circular dependency issues at module load time
    const User = (await import('./models/User')).default;

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      // Enforce admin privileges regardless of current state
      existing.role         = 'admin';
      existing.isBanned     = false;
      existing.isApproved   = true;
      existing.loginAttempts = 0;
      existing.lockUntil    = undefined;
      await existing.save();
      console.log(`✅ Admin account verified: ${ADMIN_EMAIL}`);
    } else {
      // Create brand-new admin account
      const salt           = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      await User.create({
        name:          ADMIN_NAME,
        email:         ADMIN_EMAIL,
        password:      hashedPassword,
        role:          'admin',
        isApproved:    true,
        isBanned:      false,
        loginAttempts: 0,
      });
      console.log(`✅ Admin account created: ${ADMIN_EMAIL}`);
    }
  } catch (err: any) {
    console.error('❌ Failed to ensure admin account:', err.message);
  }
};

const startServer = async () => {
  // Wait for database to fully connect (especially important for MongoMemoryServer)
  await connectDB();

  // Bootstrap / verify admin account after DB is ready
  await ensureAdminAccount();

  server = app.listen(PORT, () => {
    console.log(`🚀 FreshMarket API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();

process.on('unhandledRejection', (err: any) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
