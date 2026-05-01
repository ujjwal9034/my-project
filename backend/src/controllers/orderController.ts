import { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import asyncHandler from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const addOrderItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    deliveryType,
    pickupSlotTime,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  // Validate all products exist, have sufficient stock, and calculate prices server-side
  let calculatedItemsPrice = 0;
  const validatedItems: any[] = [];
  for (const item of orderItems) {
    if (!item.qty || item.qty <= 0) {
      res.status(400);
      throw new Error(`Invalid quantity for "${item.name || 'item'}"`);
    }
    const product = await Product.findById(item.product).populate('seller', '_id');
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.name || item.product}`);
    }
    if (product.stock < item.qty) {
      res.status(400);
      throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
    }
    calculatedItemsPrice += product.price * item.qty;
    // Store validated data from DB, not from client
    validatedItems.push({
      name: product.name,
      qty: item.qty,
      image: product.imageUrl || item.image,
      price: product.price,       // Use DB price, NEVER trust client
      product: product._id,
      seller: product.seller,     // Use DB seller, NEVER trust client
    });
  }

  // Deduct stock after all validations pass
  for (const item of validatedItems) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
  }

  // Server-side price calculation (NEVER trust client prices)
  const calculatedShippingPrice = calculatedItemsPrice > 50 ? 0 : 5;
  const calculatedTaxPrice = Number((0.05 * calculatedItemsPrice).toFixed(2));
  const calculatedTotalPrice = calculatedItemsPrice + calculatedShippingPrice + calculatedTaxPrice;

  const order = new Order({
    orderItems: validatedItems,
    user: req.user._id,
    shippingAddress: shippingAddress || {
      address: 'Pickup',
      city: 'Local',
      postalCode: '000000',
      country: 'India',
    },
    paymentMethod: paymentMethod || 'COD',
    itemsPrice: calculatedItemsPrice,
    taxPrice: calculatedTaxPrice,
    shippingPrice: calculatedShippingPrice,
    totalPrice: calculatedTotalPrice,
    deliveryType: deliveryType || 'Delivery',
    pickupSlotTime,
  });

  const createdOrder = await order.save();
  res.status(201).json(createdOrder);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('orderItems.seller', 'name email');

  if (order) {
    // Authorization: only owner, admin, or involved seller can view
    const isOwner = (order.user as any)._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isSeller = order.orderItems.some((item: any) =>
      (item.seller?._id || item.seller)?.toString() === req.user._id.toString()
    );
    if (!isOwner && !isAdmin && !isSeller) {
      res.status(403);
      throw new Error('Not authorized to view this order');
    }
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order to paid (Mock)
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    // Authorization: only order owner or admin can mark as paid
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized');
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentResult = {
      id: req.body.id || `PAY_${Date.now()}`,
      status: req.body.status || 'COMPLETED',
      update_time: req.body.update_time || new Date().toISOString(),
      email_address: req.body.email_address || req.user.email,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin/Seller
export const updateOrderStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order: any = await Order.findById(req.params.id);

  if (order) {
    // Authorization: only involved seller or admin can update status
    const isSeller = order.orderItems.some((item: any) =>
      (item.seller?._id || item.seller)?.toString() === req.user._id.toString()
    );
    if (!isSeller && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized to update this order');
    }

    // Validate status value
    const validStatuses = ['Pending', 'Packed', 'Shipped', 'Delivered', 'Ready for Pickup', 'Picked Up', 'Cancelled'];
    if (!validStatuses.includes(req.body.status)) {
      res.status(400);
      throw new Error('Invalid order status');
    }

    order.status = req.body.status;
    if (req.body.status === 'Delivered' || req.body.status === 'Picked Up') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get orders for seller
// @route   GET /api/orders/seller
// @access  Private/Seller
export const getSellerOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({ 'orderItems.seller': req.user._id })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({}).populate('user', 'id name').sort({ createdAt: -1 });
  res.json(orders);
});
