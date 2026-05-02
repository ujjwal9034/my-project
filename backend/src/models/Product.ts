import mongoose, { Schema, Document } from 'mongoose';

export interface IReview {
  user: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  photos?: string[];
}

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  stock: number;
  unit?: string;
  category: string;
  imageUrl: string;
  seller: mongoose.Types.ObjectId;
  reviews: IReview[];
  rating: number;
  numReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    photos: [{ type: String }],
  },
  { timestamps: true }
);

const ProductSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    stock: { type: Number, required: true, default: 0 },
    unit: { type: String, default: 'Item' },
    category: { type: String, required: true },
    imageUrl: { type: String, default: '/images/placeholder.png' },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviews: [ReviewSchema],
    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Indexing for search optimization
ProductSchema.index({ name: 'text', category: 'text' });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
