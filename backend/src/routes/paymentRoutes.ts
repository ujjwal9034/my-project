import express from 'express';
import { processPayment, getPaymentStatus } from '../controllers/paymentController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/process', protect, processPayment);
router.get('/:orderId', protect, getPaymentStatus);

export default router;
