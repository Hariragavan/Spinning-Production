import mongoose from 'mongoose';

const yarnCountSchema = new mongoose.Schema({
  countCode: { type: String, required: true, unique: true }, // e.g., '40s', '34/1-CH-NY', '26/1-CH-CY'
  countName: { type: String, required: true },
  description: { type: String, default: '' },
  factorTo40s: { type: Number, required: true, default: 1.0 }, // Conversion factor (e.g., 0.7836)
  standardGps: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const YarnCount = mongoose.model('YarnCount', yarnCountSchema);
