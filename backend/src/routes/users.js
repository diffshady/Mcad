const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// GET /api/users — admin only
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, role } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (role) filter.role = role;
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id/status — admin: approve/suspend
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id — admin: update user details + optional password reset
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, barangay, phone, status, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) {
      const normalizedName = String(name).trim();
      if (!normalizedName) return res.status(400).json({ message: 'Name is required' });
      if (/\d/.test(normalizedName)) return res.status(400).json({ message: 'Name must not contain numbers' });
      if (normalizedName.split(/\s+/).filter(Boolean).length < 2) {
        return res.status(400).json({ message: 'Please enter first and last name' });
      }
      user.name = normalizedName;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: req.params.id } });
      if (existingEmail) return res.status(400).json({ message: 'Email already registered' });
      user.email = normalizedEmail;
    }

    if (phone !== undefined) {
      const normalizedPhone = String(phone).replace(/\D/g, '').slice(0, 11);
      if (normalizedPhone && !/^09\d{9}$/.test(normalizedPhone)) {
        return res.status(400).json({ message: 'Phone number must be 11 digits and start with 09' });
      }
      if (normalizedPhone) {
        const existingPhone = await User.findOne({ phone: normalizedPhone, _id: { $ne: req.params.id } });
        if (existingPhone) return res.status(400).json({ message: 'Phone number already registered' });
      }
      user.phone = normalizedPhone || undefined;
    }

    if (role !== undefined) user.role = role;
    if (barangay !== undefined) user.barangay = barangay;
    if (status !== undefined) user.status = status;
    if (password && password.trim().length >= 6) user.password = password;

    await user.save(); // triggers pre-save hash if password changed
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
