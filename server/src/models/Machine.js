import mongoose from 'mongoose';

const machineSchema = new mongoose.Schema({
  machineNumber: { type: String, required: true, unique: true }, // e.g., 'SP025' - 'SP056'
  sides: { type: [String], default: ['LH', 'RH'] },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

export const Machine = mongoose.model('Machine', machineSchema);
