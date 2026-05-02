import { Request, Response } from 'express';
import Product from '../models/Product';
import asyncHandler from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';

// @desc    Fetch all products with pagination, keyword search, sorting, category filter
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const pageSize = 20;
  const page = Number(req.query.pageNumber) || 1;

  // Build filter query
  const filter: any = {};

  // Keyword search
  if (req.query.keyword) {
    filter.name = {
      $regex: req.query.keyword as string,
      $options: 'i',
    };
  }

  // Category filter
  if (req.query.category && req.query.category !== 'All') {
    filter.category = req.query.category;
  }

  // Price range
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
  }

  // In stock only
  if (req.query.inStock === 'true') {
    filter.stock = { $gt: 0 };
  }

  // Location filtering (within 5km)
  const User = require('../models/User').default;
  
  // Base query for active, approved sellers
  const activeSellerQuery: any = {
    role: 'seller',
    isApproved: true,
    isBanned: false,
    account_status: { $in: ['active', 'warned'] }
  };

  if (req.query.lat && req.query.lng) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusInKm = 5;
    const radiusInRadian = radiusInKm / 6378.1; // Earth radius in km
    
    activeSellerQuery.location = {
      $geoWithin: {
        $centerSphere: [[lng, lat], radiusInRadian]
      }
    };
  }
  
  // Find valid sellers matching the criteria
  const validSellers = await User.find(activeSellerQuery).select('_id');
  const validSellerIds = validSellers.map((seller: any) => seller._id);
  filter.seller = { $in: validSellerIds };

  // Sort options
  let sortOption: any = { createdAt: -1 }; // Default: newest first
  switch (req.query.sort) {
    case 'price_asc':
      sortOption = { price: 1 };
      break;
    case 'price_desc':
      sortOption = { price: -1 };
      break;
    case 'rating':
      sortOption = { rating: -1 };
      break;
    case 'name':
      sortOption = { name: 1 };
      break;
    case 'popular':
      sortOption = { numReviews: -1 };
      break;
  }

  const count = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('seller', 'name email storeName pickupSlots deliveryAvailable pickupAvailable deliveryCharge')
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort(sortOption);

  res.json({ products, page, pages: Math.ceil(count / pageSize), total: count });
});

// @desc    Get all unique categories
// @route   GET /api/products/categories
// @access  Public
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await Product.distinct('category');
  res.json(categories);
});

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
export const getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const User = require('../models/User').default;
  const validSellers = await User.find({
    role: 'seller',
    isApproved: true,
    isBanned: false,
    account_status: { $in: ['active', 'warned'] }
  }).select('_id');
  const validSellerIds = validSellers.map((seller: any) => seller._id);

  const products = await Product.find({ 
    category: req.params.category,
    seller: { $in: validSellerIds }
  })
    .populate('seller', 'name email storeName pickupSlots deliveryAvailable pickupAvailable deliveryCharge')
    .sort({ createdAt: -1 });
  res.json(products);
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id)
    .populate('seller', 'name email storeName pickupSlots deliveryAvailable pickupAvailable deliveryCharge isApproved isBanned account_status')
    .populate('reviews.user', 'name');

  if (product) {
    const seller: any = product.seller;
    if (seller && (!seller.isApproved || seller.isBanned || seller.account_status === 'removed' || seller.account_status === 'banned')) {
      res.status(404);
      throw new Error('Product is currently unavailable');
    }
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a product (with optional image upload)
// @route   POST /api/products
// @access  Private/Seller
export const createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user.isApproved) {
    res.status(403);
    throw new Error('Your store must be approved by an admin before you can add products.');
  }

  const { name, price, description, category, stock, unit } = req.body;
  
  if (!name || price === undefined || !description || !category || stock === undefined) {
    res.status(400);
    throw new Error('Please provide all required product fields');
  }
  
  // If a file was uploaded via multer, use its path
  let imageUrl = '/images/sample.jpg';
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
  } else if (req.body.image) {
    imageUrl = req.body.image;
  }

  const product = new Product({
    name: name || 'Sample name',
    price: price || 0,
    user: req.user._id,
    seller: req.user._id,
    imageUrl,
    category: category || 'Sample category',
    stock: stock || 0,
    unit: unit || 'Item',
    numReviews: 0,
    description: description || 'Sample description',
  });

  const createdProduct = await product.save();
  // Populate seller info before returning
  await createdProduct.populate('seller', 'name email storeName pickupSlots deliveryAvailable pickupAvailable deliveryCharge');
  res.status(201).json(createdProduct);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Seller
export const updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, price, description, category, stock, unit } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    // Only allow actual seller or admin to update
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(401);
      throw new Error('You can only edit your own products');
    }

    product.name = name !== undefined ? name : product.name;
    product.price = price !== undefined ? price : product.price;
    product.description = description !== undefined ? description : product.description;
    product.category = category !== undefined ? category : product.category;
    product.stock = stock !== undefined ? stock : product.stock;
    product.unit = unit !== undefined ? unit : product.unit;

    // Handle image update
    if (req.file) {
      product.imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      product.imageUrl = req.body.image;
    }

    const updatedProduct = await product.save();
    await updatedProduct.populate('seller', 'name email storeName pickupSlots deliveryAvailable pickupAvailable deliveryCharge');
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Seller
export const deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(401);
      throw new Error('You can only delete your own products');
    }
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get seller's own products
// @route   GET /api/products/seller/mine
// @access  Private/Seller
export const getMyProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const products = await Product.find({ seller: req.user._id })
    .populate('seller', 'name email storeName pickupSlots deliveryAvailable pickupAvailable deliveryCharge')
    .sort({ createdAt: -1 });
  res.json(products);
});

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
export const createProductReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r: any) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      res.status(400);
      throw new Error('Product already reviewed');
    }

    let photos: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      photos = req.files.map((file: any) => `/uploads/${file.filename}`);
    }

    const review = {
      user: req.user._id,
      rating: Number(rating),
      comment,
      photos,
    };

    product.reviews.push(review as any);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc: number, item: any) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});
