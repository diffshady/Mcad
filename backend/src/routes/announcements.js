const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');

// GET /api/announcements
router.get('/', protect, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    // No expiry filter — show all published, including expired
    const announcements = await Announcement.find(filter)
      .populate('postedBy', 'name role')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/announcements/all — admin: see unpublished too
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('postedBy', 'name role')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/announcements/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id).populate('postedBy', 'name role');
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    res.json(ann);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/announcements — admin, imam
router.post('/', protect, authorize('admin', 'imam'), async (req, res) => {
  try {
    const ann = await Announcement.create({ ...req.body, postedBy: req.user._id });
    res.status(201).json(ann);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/announcements/:id
router.put('/:id', protect, authorize('admin', 'imam'), async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    if (req.user.role !== 'admin' && ann.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const updated = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', protect, authorize('admin', 'imam'), async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    if (req.user.role !== 'admin' && ann.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
