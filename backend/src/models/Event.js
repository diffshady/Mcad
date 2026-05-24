const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['iftar', 'taraweeh', 'charity', 'prayer', 'announcement', 'other'],
      default: 'other',
    },
    venue: { type: String, trim: true },
    organizer: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isApproved: { type: Boolean, default: false },
    attendanceCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
