import mongoose from 'mongoose';

const millCalendarSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  isHoliday: { type: Boolean, default: false },
  reason: { type: String, default: '' }
}, { timestamps: true });

export const MillCalendar = mongoose.model('MillCalendar', millCalendarSchema);
