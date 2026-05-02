import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
  label: string;
  fullName?: string;      // Recipient's full name
  phone?: string;         // Recipient's phone
  houseNo?: string;       // House / Flat No.
  area?: string;          // Area / Street
  landmark?: string;      // Optional landmark
  address: string;        // Legacy combined address field (kept for backward compat)
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'customer' | 'seller' | 'admin';
  isApproved?: boolean; // For seller
  isBanned?: boolean;
  account_status?: 'active' | 'warned' | 'banned' | 'removed';
  warningCount?: number;
  banReason?: string;
  address?: string;
  phone?: string;
  avatar?: string;
  preferences?: {
    newsletter: boolean;
    notifications: boolean;
  };
  location?: {
    type: string;
    coordinates: number[];
  };
  storeName?: string;
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  pickupSlots?: string[];
  deliveryCharge?: number;
  kycStatus?: 'pending' | 'verified' | 'rejected';
  kycDocument?: string;
  twoFactorEnabled?: boolean;
  twoFactorCode?: string;
  twoFactorCodeExpire?: Date;
  addresses: IAddress[];
  cart?: any[];
  loginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema({
  label:    { type: String, default: 'Home' },
  fullName: { type: String },
  phone:    { type: String },
  houseNo:  { type: String },
  area:     { type: String },
  landmark: { type: String },
  address:  { type: String, required: true },   // Legacy combined field — kept for back-compat
  city:     { type: String, required: true },
  postalCode: { type: String, required: true },
  country:  { type: String, default: 'India' },
  isDefault: { type: Boolean, default: false },
});

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // optional for future OAuth
    role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer' },
    isApproved: { type: Boolean, default: false }, // Sellers need admin approval
    isBanned: { type: Boolean, default: false },
    account_status: { type: String, enum: ['active', 'warned', 'banned', 'removed'], default: 'active' },
    warningCount: { type: Number, default: 0 },
    banReason: { type: String },
    address: { type: String },
    phone: { type: String },
    avatar: { type: String },
    preferences: {
      newsletter: { type: Boolean, default: true },
      notifications: { type: Boolean, default: true },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
    storeName: { type: String },
    deliveryAvailable: { type: Boolean, default: true },
    pickupAvailable: { type: Boolean, default: true },
    pickupSlots: [{ type: String }],
    deliveryCharge: { type: Number, default: 5 },
    kycStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    kycDocument: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorCode: { type: String },
    twoFactorCodeExpire: { type: Date },
    addresses: [AddressSchema],
    cart: { type: Array, default: [] },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  { timestamps: true }
);

// Index for location-based queries
UserSchema.index({ location: '2dsphere' });

// Virtual to check if account is locked
UserSchema.virtual('isLocked').get(function (this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
