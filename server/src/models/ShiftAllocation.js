import mongoose from 'mongoose';

const sideAllocationSchema = new mongoose.Schema({
  machineNumber: { type: String, required: true },
  side: { type: String, enum: ['LH', 'RH'], required: true },
  workerToken: { type: String, default: null } // null indicates unassigned side
}, { _id: false });

const shiftAllocationSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  shift: { type: String, enum: ['I', 'II', 'III'], required: true },
  gaiterToken: { type: String, default: null },
  allocations: [sideAllocationSchema],
  isLocked: { type: Boolean, default: false },
  supervisorId: { type: String, default: null }
}, { timestamps: true });

shiftAllocationSchema.index({ date: 1, shift: 1 }, { unique: true });

export const ShiftAllocation = mongoose.model('ShiftAllocation', shiftAllocationSchema);
