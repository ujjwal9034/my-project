import express from 'express';
import {
  createReport,
  getMyReports,
  getAllReports,
  getSellerReports,
  updateReport,
  dismissReport,
} from '../controllers/reportController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

// Customer routes
router.route('/').post(protect, createReport).get(protect, admin, getAllReports);
router.route('/mine').get(protect, getMyReports);

// Seller routes
router.route('/seller').get(protect, getSellerReports);

// Admin route — update status / notes
router.route('/admin/:reportId/dismiss').post(protect, admin, dismissReport);
router.route('/:id').put(protect, admin, updateReport);

export default router;
