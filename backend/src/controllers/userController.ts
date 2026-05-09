import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import Order from '../models/Order';
import Wishlist from '../models/Wishlist';
import Product from '../models/Product';
import Report from '../models/Report';
import generateToken from '../utils/generateToken';
import sendEmail from '../utils/sendEmail';
import asyncHandler from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';
import { validateEmailDeliverable } from '../utils/validateEmail';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

// ── Cookie helper (handles cross-origin Render deployment) ────────────────────
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const authUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, twoFactorCode } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check if account is banned or removed
  if (user.isBanned || user.account_status === 'removed') {
    res.status(403);
    throw new Error('Your account has been suspended or removed. Contact support.');
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    res.status(423);
    throw new Error(`Account is locked. Try again in ${remainingMinutes} minutes.`);
  }

  if (await bcrypt.compare(password, user.password || '')) {
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.twoFactorCode = code;
        user.twoFactorCodeExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await user.save();
        
        // Fire-and-forget: send email in background for instant response
        sendEmail({
          email: user.email,
          subject: 'FreshMarket — Your Login Code',
          message: `Your two-factor authentication code is: ${code}\nThis code expires in 10 minutes.\nIf you didn't request this, please ignore this email.`,
        }).catch((emailErr: any) => {
          console.error('❌ Failed to send 2FA email:', emailErr.message);
        });

        res.json({ requires2FA: true, message: '2FA code sent to your email. Check your inbox.' });
        return;
      }

      if (user.twoFactorCode !== twoFactorCode || !user.twoFactorCodeExpire || user.twoFactorCodeExpire < new Date()) {
        res.status(401);
        throw new Error('Invalid or expired 2FA code. Please try logging in again.');
      }

      // Clear 2FA code on success
      user.twoFactorCode = undefined;
      user.twoFactorCodeExpire = undefined;
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id as string, user.role);
    res.cookie('jwt', token, getCookieOptions());
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      preferences: user.preferences,
      location: user.location,
      account_status: user.account_status,
      warningCount: user.warningCount,
      deliveryCharge: user.deliveryCharge,
      twoFactorEnabled: user.twoFactorEnabled,
      cart: user.cart,
    });
  } else {
    // Increment login attempts
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME);
      await user.save();
      res.status(423);
      throw new Error('Too many failed attempts. Account locked for 30 minutes.');
    }
    await user.save();
    
    const remaining = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
    res.status(401);
    throw new Error(`Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, address, phone, avatar, preferences, location, storeName } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // ── Real email validation (format + MX records + disposable check) ──────────
  const emailCheck = await validateEmailDeliverable(email);
  if (!emailCheck.valid && emailCheck.reason !== 'timeout' && emailCheck.reason !== 'error') {
    res.status(422);
    throw new Error(
      'Please use a real, valid email address. Temporary or fake emails are not allowed.'
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Auto-approve sellers in dev, require admin approval in production
  const isProduction = process.env.NODE_ENV === 'production';
  // SECURITY: Never allow admin registration through the API
  const effectiveRole = (role === 'seller') ? 'seller' : 'customer';
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: effectiveRole,
    isApproved: effectiveRole === 'customer' ? true : !isProduction, // Sellers need approval in production
    address,
    phone,
    avatar,
    preferences,
    location,
    storeName: effectiveRole === 'seller' ? storeName : undefined,
  });

  if (user) {
    const token = generateToken(user._id as string, user.role);
    res.cookie('jwt', token, getCookieOptions());
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      avatar: user.avatar,
      preferences: user.preferences,
      location: user.location,
      account_status: user.account_status,
      warningCount: user.warningCount,
      deliveryCharge: user.deliveryCharge,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
export const logoutUser = (req: Request, res: Response) => {
  res.cookie('jwt', '', {
    ...getCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id);
  if (user) {
    // Check email uniqueness if email is being changed
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        res.status(400);
        throw new Error('Email is already in use by another account');
      }
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.address = req.body.address || user.address;
    user.phone = req.body.phone || user.phone;
    if (req.body.avatar) user.avatar = req.body.avatar;
    if (req.body.preferences) user.preferences = { ...user.preferences, ...req.body.preferences };
    if (req.body.location) user.location = req.body.location;
    if (req.body.storeName !== undefined) user.storeName = req.body.storeName;
    if (req.body.deliveryAvailable !== undefined) user.deliveryAvailable = req.body.deliveryAvailable;
    if (req.body.pickupAvailable !== undefined) user.pickupAvailable = req.body.pickupAvailable;
    if (req.body.pickupSlots !== undefined) user.pickupSlots = req.body.pickupSlots;
    if (req.body.deliveryCharge !== undefined) user.deliveryCharge = req.body.deliveryCharge;
    if (req.body.twoFactorEnabled !== undefined) user.twoFactorEnabled = req.body.twoFactorEnabled;

    if (req.body.password) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved,
      address: updatedUser.address,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      preferences: updatedUser.preferences,
      location: updatedUser.location,
      storeName: updatedUser.storeName,
      deliveryAvailable: updatedUser.deliveryAvailable,
      pickupAvailable: updatedUser.pickupAvailable,
      pickupSlots: updatedUser.pickupSlots,
      account_status: updatedUser.account_status,
      warningCount: updatedUser.warningCount,
      deliveryCharge: updatedUser.deliveryCharge,
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      cart: updatedUser.cart,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Sync user cart
// @route   PUT /api/users/cart
// @access  Private
export const syncCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.cart = req.body.cart || [];
  await user.save();

  res.json({ message: 'Cart synced successfully', cart: user.cart });
});

// @desc    Change password (requires current password)
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password || '');
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.json({ message: 'Password changed successfully' });
});

// @desc    Delete own account
// @route   DELETE /api/users/profile
// @access  Private
export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Password is REQUIRED for account deletion
  if (!password) {
    res.status(400);
    throw new Error('Password is required to delete account');
  }
  const isMatch = await bcrypt.compare(password, user.password || '');
  if (!isMatch) {
    res.status(400);
    throw new Error('Password is incorrect');
  }

  // Delete user's wishlist
  await Wishlist.deleteMany({ user: req.user._id });
  // Delete user's products (if seller)
  if (user.role === 'seller') {
    await Product.deleteMany({ seller: req.user._id });
  }
  // Delete the user
  await User.deleteOne({ _id: req.user._id });

  res.cookie('jwt', '', { ...getCookieOptions(), maxAge: 0, expires: new Date(0) });
  res.json({ message: 'Account deleted successfully' });
});

// @desc    Add/manage addresses
// @route   POST /api/users/addresses
// @access  Private
export const addAddress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { label, fullName, phone, houseNo, area, landmark, address, city, postalCode, country, isDefault } = req.body;

  // If setting as default, unset all other defaults
  if (isDefault) {
    user.addresses.forEach((addr: any) => { addr.isDefault = false; });
  }

  // Compose legacy `address` field from houseNo + area when provided (back-compat)
  const composedAddress = address || [houseNo, area].filter(Boolean).join(', ') || 'N/A';

  user.addresses.push({
    label:    label    || 'Home',
    fullName: fullName || undefined,
    phone:    phone    || undefined,
    houseNo:  houseNo  || undefined,
    area:     area     || undefined,
    landmark: landmark || undefined,
    address:  composedAddress,
    city,
    postalCode,
    country:   country || 'India',
    isDefault: isDefault || user.addresses.length === 0,
  });
  await user.save();

  res.status(201).json(user.addresses);
});

// @desc    Delete an address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
export const deleteAddress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.addresses = user.addresses.filter(
    (addr: any) => addr._id.toString() !== req.params.addressId
  );
  await user.save();

  res.json(user.addresses);
});

// @desc    Update an existing address
// @route   PUT /api/users/addresses/:addressId
// @access  Private
export const updateAddress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const addr: any = user.addresses.find(
    (a: any) => a._id.toString() === req.params.addressId
  );
  if (!addr) {
    res.status(404);
    throw new Error('Address not found');
  }

  const { label, fullName, phone, houseNo, area, landmark, address, city, postalCode, country, isDefault } = req.body;

  if (isDefault) {
    user.addresses.forEach((a: any) => { a.isDefault = false; });
  }

  if (label     !== undefined) addr.label    = label;
  if (fullName  !== undefined) addr.fullName = fullName;
  if (phone     !== undefined) addr.phone    = phone;
  if (houseNo   !== undefined) addr.houseNo  = houseNo;
  if (area      !== undefined) addr.area     = area;
  if (landmark  !== undefined) addr.landmark = landmark;
  if (city      !== undefined) addr.city     = city;
  if (postalCode!== undefined) addr.postalCode = postalCode;
  if (country   !== undefined) addr.country  = country;
  if (isDefault !== undefined) addr.isDefault = isDefault;

  // Keep legacy `address` field in sync
  addr.address = address || [addr.houseNo, addr.area].filter(Boolean).join(', ') || addr.address;

  await user.save();
  res.json(user.addresses);
});

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  res.json(users);
});

// @desc    Get all active stores (Public)
// @route   GET /api/users/stores
// @access  Public
export const getStores = asyncHandler(async (req: Request, res: Response) => {
  const stores = await User.find({ role: 'seller', isApproved: true, isBanned: false, account_status: 'active' })
    .select('name storeName avatar address location deliveryAvailable pickupAvailable');
  res.json(stores);
});

// @desc    Approve a seller (Admin)
// @route   PUT /api/users/:id/approve
// @access  Private/Admin
export const approveSeller = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (user && user.role === 'seller') {
    user.isApproved = true;
    await user.save();
    res.json({ message: 'Seller approved successfully' });
  } else {
    res.status(404);
    throw new Error('Seller not found');
  }
});

// @desc    Ban/unban a user (Admin)
// @route   PUT /api/users/:id/ban
// @access  Private/Admin
export const toggleBanUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Prevent admins from banning themselves
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot ban yourself');
  }

  // Protect the seeded admin account — can never be banned
  const protectedAdminEmail = process.env.ADMIN_EMAIL || 'ujjwalchauhan599@gmail.com';
  if (user.email === protectedAdminEmail) {
    res.status(403);
    throw new Error('This admin account is protected and cannot be banned.');
  }

  user.isBanned = !user.isBanned;
  await user.save();

  res.json({
    message: user.isBanned ? 'User banned successfully' : 'User unbanned successfully',
    isBanned: user.isBanned,
  });
});

// @desc    Delete a user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot delete yourself');
  }

  // Protect the seeded admin account — can never be deleted
  const protectedAdminEmail = process.env.ADMIN_EMAIL || 'ujjwalchauhan599@gmail.com';
  if (user.email === protectedAdminEmail) {
    res.status(403);
    throw new Error('This admin account is protected and cannot be deleted.');
  }

  await Wishlist.deleteMany({ user: req.params.id });
  if (user.role === 'seller') {
    await Product.deleteMany({ seller: req.params.id });
  }
  await User.deleteOne({ _id: req.params.id });

  res.json({ message: 'User deleted successfully' });
});

// @desc    Get admin dashboard stats
// @route   GET /api/users/admin/stats
// @access  Private/Admin
export const getAdminStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const totalUsers = await User.countDocuments();
  const totalOrders = await Order.countDocuments();
  const totalRevenue = await Order.aggregate([
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ]);
  const totalCustomers = await User.countDocuments({ role: 'customer' });
  const totalSellers = await User.countDocuments({ role: 'seller' });
  const pendingSellers = await User.countDocuments({ role: 'seller', isApproved: false });
  const paidOrders = await Order.countDocuments({ isPaid: true });
  const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });

  // New admin stats
  const bannedUsers = await User.countDocuments({ isBanned: true });
  const removedUsers = await User.countDocuments({ account_status: 'removed' });
  const pendingReports = await Report.countDocuments({ status: 'pending' });

  // Recent user signups (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

  // Monthly revenue (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyRevenue = await Order.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo }, isPaid: true } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    totalUsers,
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    totalCustomers,
    totalSellers,
    pendingSellers,
    paidOrders,
    deliveredOrders,
    recentUsers,
    monthlyRevenue,
    bannedUsers,
    removedUsers,
    pendingReports,
  });
});

// @desc    Forgot password
// @route   POST /api/users/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // Don't reveal if user exists or not for security
    res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });
    return;
  }

  // Get reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  // Set expire (10 minutes)
  user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);

  await user.save();

  // Create reset url
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password.\n\nPlease click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`;

  // Fire-and-forget: send email in background for instant response
  sendEmail({
    email: user.email,
    subject: 'FreshMarket — Password Reset Request',
    message,
  }).catch((error) => {
    console.error('❌ Failed to send password reset email:', (error as any).message);
  });

  res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });
});

// @desc    Reset password
// @route   PUT /api/users/reset-password/:token
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  // Get hashed token
  const token = req.params.token as string;
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: new Date() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  // Validate new password
  const { password } = req.body;
  if (!password || password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  // Set new password
  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(password, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully. You can now login with your new password.' });
});

// @desc    Admin action on user (warning, ban, remove)
// @route   POST /api/users/admin/:userId/action
// @access  Private/Admin
export const userAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { action } = req.body;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot perform this action on an admin');
  }

  if (action === 'warning') {
    user.warningCount = (user.warningCount || 0) + 1;
    user.account_status = 'warned';
  } else if (action === 'ban') {
    user.isBanned = true;
    user.account_status = 'banned';
    user.banReason = 'Banned by admin';
  } else if (action === 'unban') {
    user.isBanned = false;
    user.account_status = 'active';
    user.banReason = undefined;
  } else if (action === 'remove') {
    user.account_status = 'removed';
    user.isBanned = true;
  } else if (action === 'verify_kyc') {
    user.kycStatus = 'verified';
  } else if (action === 'reject_kyc') {
    user.kycStatus = 'rejected';
  } else if (action === 'undo_kyc') {
    user.kycStatus = 'pending';
  } else {
    res.status(400);
    throw new Error('Invalid action');
  }

  await user.save();
  res.json({ message: `User action '${action}' applied successfully` });
});

// @desc    Upload Seller KYC Document
// @route   POST /api/users/kyc
// @access  Private/Seller
export const uploadKycDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role !== 'seller') {
    res.status(403);
    throw new Error('Only sellers can upload KYC documents');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a document');
  }

  user.kycDocument = `/uploads/${req.file.filename}`;
  user.kycStatus = 'pending';
  
  await user.save();
  
  res.json({
    message: 'KYC document uploaded successfully. Awaiting admin verification.',
    kycStatus: user.kycStatus,
    kycDocument: user.kycDocument,
  });
});

