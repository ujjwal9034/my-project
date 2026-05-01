import { Response } from 'express';
import Wishlist from '../models/Wishlist';
import asyncHandler from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
    path: 'products',
    populate: { path: 'seller', select: 'name' },
  });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  res.json(wishlist);
});

// @desc    Add product to wishlist
// @route   POST /api/wishlist/:productId
// @access  Private
export const addToWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  const productId = req.params.productId;

  if (wishlist.products.some((p: any) => p.toString() === productId)) {
    res.status(400);
    throw new Error('Product already in wishlist');
  }

  wishlist.products.push(productId as any);
  await wishlist.save();

  // Re-fetch with populated data
  const populated = await Wishlist.findById(wishlist._id).populate({
    path: 'products',
    populate: { path: 'seller', select: 'name' },
  });

  res.status(201).json(populated);
});

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
export const removeFromWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    res.status(404);
    throw new Error('Wishlist not found');
  }

  wishlist.products = wishlist.products.filter(
    (p: any) => p.toString() !== req.params.productId
  );
  await wishlist.save();

  const populated = await Wishlist.findById(wishlist._id).populate({
    path: 'products',
    populate: { path: 'seller', select: 'name' },
  });

  res.json(populated);
});
