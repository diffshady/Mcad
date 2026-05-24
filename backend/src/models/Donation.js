const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donorName: { type: String, default: 'Anonymous' },
    donationType: { type: String, enum: ['cash', 'food', 'supplies'], required: true },
    amount: { type: Number },
    quantity: { type: String },
    description: { type: String },
    dateReceived: { type: Date, default: Date.now },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Donation', donationSchema);
