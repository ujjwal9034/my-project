import express from 'express';
import {
  authUser,
  registerUser,
  logoutUser,
  getUsers,
  getUserProfile,
  updateUserProfile,
  approveSeller,
  changePassword,
  deleteAccount,
  addAddress,
  deleteAddress,
  updateAddress,
  toggleBanUser,
  deleteUser,
  getAdminStats,
  forgotPassword,
  resetPassword,
  userAction,
  syncCart,
  getStores,
  uploadKycDocument,
} from '../controllers/userController';
import { protect, admin, seller } from '../middlewares/authMiddleware';
import upload from '../config/upload';
import { authLimiter, sensitiveLimiter } from '../middlewares/rateLimiter';
import {
  registerValidation,
  loginValidation,
  profileValidation,
  changePasswordValidation,
} from '../middlewares/validate';

const router = express.Router();

// Public routes
router.route('/stores').get(getStores);
router.route('/').post(authLimiter, registerValidation, registerUser).get(protect, admin, getUsers);
router.post('/login', authLimiter, loginValidation, authUser);
router.post('/logout', logoutUser);

// Password reset
router.post('/forgot-password', sensitiveLimiter, forgotPassword);
router.put('/reset-password/:token', sensitiveLimiter, resetPassword);

// Profile routes
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, profileValidation, updateUserProfile)
  .delete(protect, deleteAccount);

// Seller KYC
router.post('/kyc', protect, seller, upload.single('document'), uploadKycDocument);

// Cart
router.route('/cart').put(protect, syncCart);

// Password change
router.put('/change-password', protect, sensitiveLimiter, changePasswordValidation, changePassword);

// Address book
router.route('/addresses').post(protect, addAddress);
router.route('/addresses/:addressId')
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

// Admin routes
router.get('/admin/stats', protect, admin, getAdminStats);
router.post('/admin/:userId/action', protect, admin, userAction);
router.put('/:id/approve', protect, admin, approveSeller);
router.put('/:id/ban', protect, admin, toggleBanUser);
router.delete('/:id', protect, admin, deleteUser);

export default router;
