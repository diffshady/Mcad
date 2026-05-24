const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: { type: Number, unique: true, sparse: true, immutable: true },
    ticketNumber: { type: String, unique: true, sparse: true, immutable: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    appointmentDate: { type: Date, required: true },
    venue: { type: String, trim: true },
    appointedWith: { type: String, trim: true }, // person/office name
    purpose: {
      type: String,
      enum: ['consultation', 'event_coordination', 'donation', 'community_concern', 'prayer_schedule', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true }, // admin notes / remarks
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

appointmentSchema.pre('validate', async function (next) {
  if (!this.isNew) return next();

  if (!this.appointmentNumber) {
    const last = await this.constructor
      .findOne({ appointmentNumber: { $exists: true } })
      .sort({ appointmentNumber: -1 })
      .select('appointmentNumber')
      .lean();

    this.appointmentNumber = (last?.appointmentNumber || 0) + 1;
  }

  if (!this.ticketNumber && this.appointmentNumber) {
    this.ticketNumber = `ticket-${String(this.appointmentNumber).padStart(5, '0')}`;
  }

  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
