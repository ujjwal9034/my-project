import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  createProductReview,
  getProductsByCategory,
  getCategories,
} from '../controllers/productController';
import { protect, seller } from '../middlewares/authMiddleware';
import upload from '../config/upload';
import { productValidation, reviewValidation } from '../middlewares/validate';

const router = express.Router();

router.route('/').get(getProducts).post(protect, seller, upload.single('image'), productValidation, createProduct);
router.route('/categories').get(getCategories);
router.route('/category/:category').get(getProductsByCategory);
router.route('/seller/mine').get(protect, seller, getMyProducts);
router.route('/:id/reviews').post(protect, upload.array('photos', 3), reviewValidation, createProductReview);
router.route('/:id').get(getProductById).put(protect, seller, upload.single('image'), updateProduct).delete(protect, seller, deleteProduct);

export default router;
