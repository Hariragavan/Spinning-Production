import mongoose from 'mongoose';

const incentiveSlabSchema = new mongoose.Schema({
  minGps: { type: Number, required: true },
  amountPerSide: { type: Number, required: true } // Base INR for 1 full machine side (50% of machine)
}, { _id: false });

const incentiveRuleSchema = new mongoose.Schema({
  countPattern: { type: String, required: true, unique: true }, // Exact string or regex: '26/1-CH-CY', '30/1-CH-NY', '36/1-CHY', '042/1-CH-NY', '40s', '34/1-CH-NY'
  slabs: [incentiveSlabSchema],
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const IncentiveRule = mongoose.model('IncentiveRule', incentiveRuleSchema);
