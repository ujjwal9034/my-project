import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  qty: number;
  image: string;
  price: number;
  seller: mongoose.Types.ObjectId;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  orderItems: IOrderItem[];
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
  paymentResult?: {
    id: string;
    status: string;
    update_time: string;
    email_address: string;
  };
  itemsPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  isDelivered: boolean;
  deliveredAt?: Date;
  status: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Ready for Pickup' | 'Picked Up' | 'Cancelled';
  deliveryType: 'Delivery' | 'Pickup';
  pickupSlotTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
        seller: { type: Schema.Types.ObjectId, required: true, ref: 'User' }, // Track seller for partial order fulfillment
      },
    ],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: { type: String, required: true, default: 'COD' },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    itemsPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },
    status: { type: String, enum: ['Pending', 'Packed', 'Shipped', 'Delivered', 'Ready for Pickup', 'Picked Up', 'Cancelled'], default: 'Pending' },
    deliveryType: { type: String, enum: ['Delivery', 'Pickup'], default: 'Delivery' },
    pickupSlotTime: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
