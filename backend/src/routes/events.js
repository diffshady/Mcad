const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');
const { deriveEventStatus, syncEventStatuses } = require('../utils/eventStatus');

// GET /api/events
router.get('/', protect, async (req, res) => {
  try {
    await syncEventStatuses(Event);

    const { status, type, approved } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    // Viewers only see approved events
    if (req.user.role === 'viewer') {
      filter.isApproved = true;
    } else if (approved !== undefined) {
      filter.isApproved = approved === 'true';
    }

    const events = await Event.find(filter)
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name')
      .sort({ startDate: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/events/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.status !== 'cancelled') {
      const nextStatus = deriveEventStatus(event);
      if (event.status !== nextStatus) {
        event.status = nextStatus;
        await event.save();
      }
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events — admin, imam, leader
router.post('/', protect, authorize('admin', 'imam', 'leader'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date cannot be before the start date.' });
    }
    const payload = { ...req.body, createdBy: req.user._id };
    if (payload.status !== 'cancelled') {
      payload.status = deriveEventStatus(payload);
    }
    const event = await Event.create(payload);
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/events/:id
router.put('/:id', protect, authorize('admin', 'imam', 'leader'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Only admin can approve; non-admin can only edit their own
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this event' });
    }

    const payload = { ...req.body };
    if (payload.status !== 'cancelled') {
      payload.status = deriveEventStatus({
        startDate: payload.startDate || event.startDate,
        endDate: payload.endDate !== undefined ? payload.endDate : event.endDate,
        status: payload.status || event.status,
      });
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/events/:id/approve — admin only
router.put('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, approvedBy: req.user._id },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/events/:id
router.delete('/:id', protect, authorize('admin', 'imam', 'leader'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
