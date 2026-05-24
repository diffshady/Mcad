const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { protect, authorize } = require('../middleware/auth');

// GET /api/appointments
// Admin/imam sees all; leader/viewer sees only their own
router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    if (!['admin', 'imam'].includes(req.user.role)) {
      filter.requestedBy = req.user._id;
    }

    const appointments = await Appointment.find(filter)
      .populate('requestedBy', 'name role barangay')
      .populate('reviewedBy', 'name')
      .sort({ appointmentNumber: 1, appointmentDate: 1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/appointments/next-ticket
router.get('/next-ticket', protect, async (req, res) => {
  try {
    const last = await Appointment.findOne({ appointmentNumber: { $exists: true } })
      .sort({ appointmentNumber: -1 })
      .select('appointmentNumber')
      .lean();

    const nextNumber = (last?.appointmentNumber || 0) + 1;
    const ticketNumber = `ticket-${String(nextNumber).padStart(5, '0')}`;

    res.json({ appointmentNumber: nextNumber, ticketNumber });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/appointments/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('requestedBy', 'name role barangay phone email')
      .populate('reviewedBy', 'name');

    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    // Only admin/imam or the owner can view
    if (!['admin', 'imam'].includes(req.user.role) && appt.requestedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(appt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/appointments — any authenticated user can request
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, appointmentDate, venue, appointedWith, purpose } = req.body;

    if (!title || !appointmentDate) {
      return res.status(400).json({ message: 'Title and appointment date are required' });
    }

    const appt = await Appointment.create({
      title,
      description,
      appointmentDate,
      venue,
      appointedWith,
      purpose,
      requestedBy: req.user._id,
    });

    res.status(201).json(appt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/appointments/:id — owner can edit if still pending
router.put('/:id', protect, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    const isOwner = appt.requestedBy.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'imam'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit this appointment' });
    }

    // Owner can only edit if pending
    if (isOwner && !isAdmin && appt.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot edit an appointment that is no longer pending' });
    }

    const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('requestedBy', 'name role barangay');

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/appointments/:id/review — admin/imam: approve or reject
router.put('/:id/review', protect, authorize('admin', 'imam'), async (req, res) => {
  try {
    const { status, notes, rejectionReason } = req.body;

    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved, rejected, or completed' });
    }

    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status, notes, rejectionReason, reviewedBy: req.user._id },
      { new: true }
    ).populate('requestedBy', 'name role barangay');

    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    res.json(appt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/appointments/:id/cancel — owner can cancel pending/approved
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    const isOwner = appt.requestedBy.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'imam'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!['pending', 'approved'].includes(appt.status)) {
      return res.status(400).json({ message: 'Cannot cancel a completed or already cancelled appointment' });
    }

    appt.status = 'cancelled';
    await appt.save();

    res.json(appt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/appointments/:id — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndDelete(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
