const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    attendees: [
      {
        name: { type: String, required: true },
        barangay: { type: String },
        contactNumber: { type: String },
        present: { type: Boolean, default: true },
      },
    ],
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalAttendees: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
