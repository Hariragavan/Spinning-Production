import mongoose from 'mongoose';

const machineEMLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  shift: { type: String, enum: ['I', 'II', 'III'], required: true },
  machineNumber: { type: String, required: true },
  breakCount: { type: Number, default: 0 },
  pneumafilWastePct: { type: Number, default: 0.0 },
  emValue: { type: Number, required: true } // e.g. 2.15, triggers alert if > 4.0
}, { timestamps: true });

machineEMLogSchema.index({ date: 1, shift: 1, machineNumber: 1 }, { unique: true });

export const MachineEMLog = mongoose.model('MachineEMLog', machineEMLogSchema);
