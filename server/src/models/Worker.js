import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema({
  tokenNumber: { type: String, required: true, unique: true }, // e.g., '8937', '24151', '70152'
  name: { type: String, required: true },
  department: { type: String, default: 'SIDER' },
  avatarUrl: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  hireDate: { type: Date, default: Date.now },
  contactPhone: { type: String, default: '' },
  skillGrade: { type: String, enum: ['A', 'B', 'C', 'Specialist'], default: 'A' }
}, { timestamps: true });

export const Worker = mongoose.model('Worker', workerSchema);
