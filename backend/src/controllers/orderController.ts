import { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import asyncHandler from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';
import sendEmail from '../utils/sendEmail';

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
      seller: (product.seller as any)._id || product.seller,     // Use DB seller, extract _id if populated
    });
  }

  // Deduct stock after all validations pass
  for (const item of validatedItems) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
  }

  // Server-side price calculation (NEVER trust client prices)
  const sellerCharges = new Map<string, number>();
  for (const item of validatedItems) {
    const sellerId = item.seller.toString();
    if (!sellerCharges.has(sellerId)) {
      const seller = await User.findById(sellerId);
      sellerCharges.set(sellerId, seller?.deliveryCharge ?? 5);
    }
  }
  const calculatedShippingPrice = deliveryType === 'Pickup' ? 0 : Array.from(sellerCharges.values()).reduce((a, b) => a + b, 0);

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

  // Notify sellers about new order (fire-and-forget)
  const sellerIds = [...new Set(validatedItems.map((item: any) => item.seller.toString()))];
  for (const sid of sellerIds) {
    const sellerUser = await User.findById(sid);
    if (sellerUser?.email) {
      sendEmail({
        email: sellerUser.email,
        subject: '🛒 New Order Received - FreshMart',
        message: `You have a new order #${createdOrder._id.toString().slice(-8).toUpperCase()}! Total: ₹${calculatedTotalPrice.toFixed(2)}. Log in to your seller dashboard to review and fulfill.`,
      }).catch(() => {});
    }
  }

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
    const isBuyer = (order.user as any)._id?.toString() === req.user._id.toString() || order.user.toString() === req.user._id.toString();

    if (!isSeller && req.user.role !== 'admin') {
      // Allow buyer to cancel only if order is still Pending or Packed
      const cancelableStatuses = ['Pending', 'Packed'];
      if (isBuyer && req.body.status === 'Cancelled' && cancelableStatuses.includes(order.status)) {
        // Allowed — order hasn't shipped yet
      } else if (isBuyer && req.body.status === 'Cancelled' && !cancelableStatuses.includes(order.status)) {
        res.status(400);
        throw new Error('Order cannot be cancelled after it has been shipped. Please contact the seller for assistance.');
      } else {
        res.status(403);
        throw new Error('Not authorized to update this order');
      }
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

    // Email customer about status change (fire-and-forget)
    const customer = await User.findById(order.user._id || order.user);
    if (customer?.email) {
      const statusMessages: Record<string, string> = {
        'Packed': 'Your order has been packed and is being prepared for dispatch.',
        'Shipped': 'Your order is on its way! It has been shipped.',
        'Delivered': 'Your order has been delivered. Enjoy your fresh groceries! 🎉',
        'Ready for Pickup': 'Your order is ready for pickup at the store.',
        'Picked Up': 'Your pickup order is complete. Thank you for shopping with us! 🎉',
        'Cancelled': 'Your order has been cancelled.',
      };
      const msg = statusMessages[req.body.status];
      if (msg) {
        sendEmail({
          email: customer.email,
          subject: `📦 Order Update: ${req.body.status} - FreshMart`,
          message: `Hi ${customer.name},\n\n${msg}\n\nOrder ID: #${order._id.toString().slice(-8).toUpperCase()}\nTotal: ₹${order.totalPrice.toFixed(2)}\n\nThank you for shopping with FreshMart!`,
        }).catch(() => {});
      }
    }

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
  const orders = await Order.find({})
    .populate('user', 'id name email')
    .populate('orderItems.seller', 'name storeName')
    .sort({ createdAt: -1 });
  res.json(orders);
});
