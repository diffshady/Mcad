const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

// GET /api/attendance — by event
router.get('/', protect, async (req, res) => {
  try {
    const { event } = req.query;
    const filter = {};
    if (event) filter.event = event;
    const records = await Attendance.find(filter)
      .populate('event', 'title startDate status')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id)
      .populate('event', 'title startDate venue status')
      .populate('recordedBy', 'name');
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/attendance — admin, barangay admin, imam, leader
router.post('/', protect, authorize('admin', 'barangay_admin', 'imam', 'leader'), async (req, res) => {
  try {
    const { event, attendees } = req.body;
    const existing = await Attendance.findOne({ event });
    if (existing) {
      return res.status(400).json({ message: 'Attendance record already exists for this event. Use PUT to update.' });
    }

    const totalAttendees = attendees ? attendees.filter((a) => a.present).length : 0;
    const record = await Attendance.create({
      event,
      attendees,
      totalAttendees,
      recordedBy: req.user._id,
    });

    await Event.findByIdAndUpdate(event, { attendanceCount: totalAttendees });

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/attendance/:id
router.put('/:id', protect, authorize('admin', 'barangay_admin', 'imam', 'leader'), async (req, res) => {
  try {
    const existingRecord = await Attendance.findById(req.params.id).select('event');
    if (!existingRecord) return res.status(404).json({ message: 'Record not found' });

    const linkedEvent = await Event.findById(existingRecord.event).select('status');
    if (linkedEvent?.status === 'completed' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can edit attendance for completed events' });
    }

    const { attendees } = req.body;
    const totalAttendees = attendees ? attendees.filter((a) => a.present).length : 0;
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { ...req.body, totalAttendees },
      { new: true, runValidators: true }
    );

    await Event.findByIdAndUpdate(record.event, { attendanceCount: totalAttendees });
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/attendance/:id — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
