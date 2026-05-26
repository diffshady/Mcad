const mongoose = require('mongoose');
const Counter = require('./Counter');

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

    const maxExisting = last?.appointmentNumber || 0;
    await Counter.updateOne(
      { _id: 'appointmentNumber' },
      { $setOnInsert: { seq: 0 } },
      { upsert: true }
    );

    await Counter.updateOne(
      { _id: 'appointmentNumber', seq: { $lt: maxExisting } },
      { $set: { seq: maxExisting } }
    );

    const counter = await Counter.findOneAndUpdate(
      { _id: 'appointmentNumber' },
      { $inc: { seq: 1 } },
      { new: true }
    );

    this.appointmentNumber = counter.seq;
  }

  if (!this.ticketNumber && this.appointmentNumber) {
    this.ticketNumber = `ticket-${String(this.appointmentNumber).padStart(5, '0')}`;
  }

  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
