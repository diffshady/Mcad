const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required')
      .matches(/^[^0-9]+$/).withMessage('Name must not contain numbers'),
    body('email').isEmail({ require_tld: true }).normalizeEmail().withMessage('Please enter a valid email address (e.g. name@gmail.com)'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional({ checkFalsy: true })
      .matches(/^09\d{9}$/).withMessage('Phone number must be 11 digits and start with 09'),
    body('role').isIn(['admin', 'barangay_admin', 'imam', 'leader', 'viewer']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, password, role, barangay, phone } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already registered' });

      if (phone) {
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
          return res.status(400).json({ message: 'Phone number already registered' });
        }
      }

      const duplicateName = await User.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
      if (duplicateName) return res.status(400).json({ message: 'An account with this name already exists. Please use your full name or contact the administrator.' });

      const status = role === 'viewer' ? 'active' : 'pending';
      const user = await User.create({ name, email, password, role, barangay, phone, status });

      res.status(201).json({
        message: role === 'viewer' ? 'Registration successful' : 'Registration submitted. Awaiting admin approval.',
        user,
        token: generateToken(user._id),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail({ require_tld: true }).normalizeEmail().withMessage('Please enter a valid email address (e.g. name@gmail.com)'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Account suspended. Contact administrator.' });
      }
      if (user.status === 'pending') {
        return res.status(403).json({ message: 'Account pending approval. Contact administrator.' });
      }

      res.json({ user, token: generateToken(user._id) });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/change-password — logged-in user changes own password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password — send reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email });
    // Always return success to avoid email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `MCAD System <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'MCAD – Password Reset Request',
      html: `
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Click the link below (valid for 1 hour):</p>
        <a href="${resetUrl}" style="background:#1a5c3a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0">Reset Password</a>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send email. ' + err.message });
  }
});

// POST /api/auth/reset-password/:token — reset with token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired' });

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
