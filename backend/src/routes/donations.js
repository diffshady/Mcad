const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const { protect, authorize } = require('../middleware/auth');

// GET /api/donations
router.get('/', protect, async (req, res) => {
  try {
    const { type, event } = req.query;
    const filter = {};
    if (type) filter.donationType = type;
    if (event) filter.event = event;

    const donations = await Donation.find(filter)
      .populate('event', 'title')
      .populate('recordedBy', 'name')
      .sort({ dateReceived: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/donations/summary
router.get('/summary', protect, async (req, res) => {
  try {
    const cash = await Donation.aggregate([
      { $match: { donationType: 'cash' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const byType = await Donation.aggregate([
      { $group: { _id: '$donationType', count: { $sum: 1 } } },
    ]);
    res.json({ cashTotal: cash[0]?.total || 0, byType });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/donations/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('event', 'title')
      .populate('recordedBy', 'name');
    if (!donation) return res.status(404).json({ message: 'Donation not found' });
    res.json(donation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/donations — all authenticated users
router.post('/', protect, async (req, res) => {
  try {
    const donation = await Donation.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json(donation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/donations/:id
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const donation = await Donation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!donation) return res.status(404).json({ message: 'Donation not found' });
    res.json(donation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/donations/:id — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });
    res.json({ message: 'Donation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
