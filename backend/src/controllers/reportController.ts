import { Response } from 'express';
import Report from '../models/Report';
import Order from '../models/Order';
import asyncHandler from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';

// @desc    File a complaint or review against an order
// @route   POST /api/reports
// @access  Private (customer)
export const createReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId, type, message, rating } = req.body;

  if (!orderId || !type || !message) {
    res.status(400);
    throw new Error('orderId, type, and message are required');
  }

  if (!['complaint', 'review'].includes(type)) {
    res.status(400);
    throw new Error('type must be "complaint" or "review"');
  }

  if (type === 'review' && rating !== undefined) {
    if (rating < 1 || rating > 5) {
      res.status(400);
      throw new Error('Rating must be between 1 and 5');
    }
  }

  // Verify the order belongs to this customer
  const order: any = await Order.findById(orderId).populate('orderItems.seller', '_id name storeName');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to report this order');
  }

  // Derive seller from the first order item
  const firstItem = order.orderItems?.[0];
  const sellerId = firstItem?.seller?._id ?? firstItem?.seller;
  if (!sellerId) {
    res.status(400);
    throw new Error('Could not determine seller from order');
  }

  const report = await Report.create({
    user:    req.user._id,
    order:   orderId,
    seller:  sellerId,
    type,
    message,
    rating:  type === 'review' ? rating : undefined,
    status:  'pending',
  });

  res.status(201).json(report);
});

// @desc    Get all reports filed by the logged-in customer
// @route   GET /api/reports/mine
// @access  Private (customer)
export const getMyReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reports = await Report.find({ user: req.user._id })
    .populate('order', '_id createdAt totalPrice')
    .populate('seller', 'name storeName')
    .sort({ createdAt: -1 });

  res.json(reports);
});

// @desc    Get all reports (admin view)
// @route   GET /api/reports
// @access  Private/Admin
export const getAllReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reports = await Report.find({})
    .populate('user', 'name email')
    .populate('order', '_id createdAt totalPrice')
    .populate('seller', 'name storeName')
    .sort({ createdAt: -1 });

  res.json(reports);
});

// @desc    Update report status + admin notes (admin only)
// @route   PUT /api/reports/:id
// @access  Private/Admin
export const updateReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, adminNotes } = req.body;
  const report = await Report.findById(req.params.id);

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  if (status && !['pending', 'resolved', 'dismissed'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status value');
  }

  if (status)     report.status     = status;
  if (adminNotes !== undefined) report.adminNotes = adminNotes;

  const updated = await report.save();
  res.json(updated);
});

// @desc    Dismiss a report
// @route   POST /api/reports/admin/:reportId/dismiss
// @access  Private/Admin
export const dismissReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { adminNotes } = req.body;
  const report = await Report.findById(req.params.reportId);

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  report.status = 'dismissed';
  if (adminNotes !== undefined) report.adminNotes = adminNotes;

  const updated = await report.save();
  res.json({ message: 'Report dismissed successfully', report: updated });
});
