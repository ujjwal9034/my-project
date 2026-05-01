import express from 'express';
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlistController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/').get(protect, getWishlist);
router.route('/:productId').post(protect, addToWishlist).delete(protect, removeFromWishlist);

export default router;
