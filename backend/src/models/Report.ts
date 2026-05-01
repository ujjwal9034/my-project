import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  user: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  type: 'complaint' | 'review';
  message: string;
  rating?: number;            // 1–5, only meaningful for reviews
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;        // Admin leaves notes after reviewing
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    user:       { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    order:      { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    seller:     { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    type:       { type: String, enum: ['complaint', 'review'], required: true },
    message:    { type: String, required: true, trim: true },
    rating:     { type: Number, min: 1, max: 5 },
    status:     { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
    adminNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

// One user can file multiple reports (one per order+type combination is NOT enforced here
// so that a customer may file both a complaint AND a review for the same order)
ReportSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);
