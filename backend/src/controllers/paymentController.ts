import { Request, Response } from 'express';
import Order from '../models/Order';
import asyncHandler from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';

// Simulated payment processing — works like a real gateway but runs locally
// No external API keys needed!

interface PaymentRequest {
  orderId: string;
  paymentMethod: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  upiId?: string;
  amount: number;
}

// Simple Luhn algorithm to validate card numbers
function isValidCardNumber(num: string): boolean {
  const digits = num.replace(/\s/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

// @desc    Process a payment (simulated gateway)
// @route   POST /api/payment/process
// @access  Private
export const processPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId, paymentMethod, cardNumber, expiryDate, cvv, upiId, amount }: PaymentRequest = req.body;

  // Find the order
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Verify order belongs to user
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Already paid check
  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid');
  }

  // Simulate payment processing based on method
  let paymentResult: any = null;

  if (paymentMethod === 'Card') {
    // Validate card details
    if (!cardNumber || !expiryDate || !cvv) {
      res.status(400);
      throw new Error('Card details are required');
    }

    const cleanCard = cardNumber.replace(/\s/g, '');
    
    // Check card number format
    if (!/^\d{13,19}$/.test(cleanCard)) {
      res.status(400);
      throw new Error('Invalid card number format');
    }

    // Check expiry
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      res.status(400);
      throw new Error('Invalid expiry date format (MM/YY)');
    }

    const [month, year] = expiryDate.split('/').map(Number);
    const now = new Date();
    const expiry = new Date(2000 + year, month);
    if (expiry < now) {
      res.status(400);
      throw new Error('Card has expired');
    }

    // Check CVV
    if (!/^\d{3,4}$/.test(cvv)) {
      res.status(400);
      throw new Error('Invalid CVV');
    }

    // Simulate: cards ending in 0000 are declined for testing
    if (cleanCard.endsWith('0000')) {
      res.status(400);
      throw new Error('Payment declined. Please try a different card.');
    }

    paymentResult = {
      id: `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      status: 'COMPLETED',
      update_time: new Date().toISOString(),
      email_address: req.user.email,
    };

  } else if (paymentMethod === 'UPI') {
    if (!upiId) {
      res.status(400);
      throw new Error('UPI ID is required');
    }

    // Validate UPI ID format
    if (!/^[\w.-]+@[\w]+$/.test(upiId)) {
      res.status(400);
      throw new Error('Invalid UPI ID format (e.g., name@upi)');
    }

    paymentResult = {
      id: `UPI_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      status: 'COMPLETED',
      update_time: new Date().toISOString(),
      email_address: req.user.email,
    };

  } else if (paymentMethod === 'COD') {
    // COD doesn't need payment processing — mark as pending payment
    paymentResult = {
      id: `COD_${Date.now()}`,
      status: 'PENDING_DELIVERY',
      update_time: new Date().toISOString(),
      email_address: req.user.email,
    };
    
    // COD orders are NOT marked as paid until delivery
    order.paymentMethod = 'COD';
    order.paymentResult = paymentResult;
    await order.save();
    
    return res.json({
      success: true,
      message: 'Order placed with Cash on Delivery',
      paymentResult,
      order,
    });
  } else {
    res.status(400);
    throw new Error('Invalid payment method');
  }

  // Mark order as paid for Card/UPI
  order.isPaid = true;
  order.paidAt = new Date();
  order.paymentResult = paymentResult;
  order.paymentMethod = paymentMethod;

  const updatedOrder = await order.save();

  res.json({
    success: true,
    message: 'Payment processed successfully!',
    paymentResult,
    order: updatedOrder,
  });
});

// @desc    Get payment status for an order
// @route   GET /api/payment/:orderId
// @access  Private
export const getPaymentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.orderId);
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Authorization: only order owner or admin can view payment status
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this payment');
  }

  res.json({
    isPaid: order.isPaid,
    paidAt: order.paidAt,
    paymentMethod: order.paymentMethod,
    paymentResult: order.paymentResult,
  });
});
