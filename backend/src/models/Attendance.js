const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    attendees: [
      {
        name: { type: String, required: true },
        barangay: { type: String },
        contactNumber: {
          type: String,
          trim: true,
          set: (value) => {
            if (value === undefined || value === null || value === '') return value;
            return String(value).replace(/\D/g, '').slice(0, 11);
          },
          validate: {
            validator: (value) => !value || /^\d{11}$/.test(value),
            message: 'Contact number must be exactly 11 digits',
          },
        },
        present: { type: Boolean, default: true },
      },
    ],
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalAttendees: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
