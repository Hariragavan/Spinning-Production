import mongoose from 'mongoose';

const dailyProductionLogSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  shift: { type: String, enum: ['I', 'II', 'III'], required: true },
  machineNumber: { type: String, required: true },
  countCode: { type: String, required: true },
  hanks: { type: Number, default: 0 },
  productionKg: { type: Number, required: true },
  targetKg: { type: Number, default: 0 },
  runHours: { type: Number, default: 8.0 },
  stoppedHours: { type: Number, default: 0.0 },
  actualGps: { type: Number, required: true },
  utilizationPct: { type: Number, default: 0.0 },
  efficiencyPct: { type: Number, default: 0.0 }
}, { timestamps: true });

dailyProductionLogSchema.index({ date: 1, shift: 1, machineNumber: 1 }, { unique: true });

export const DailyProductionLog = mongoose.model('DailyProductionLog', dailyProductionLogSchema);
