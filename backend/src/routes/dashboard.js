const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Announcement = require('../models/Announcement');
const Attendance = require('../models/Attendance');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { syncEventStatuses } = require('../utils/eventStatus');

// GET /api/dashboard/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const now = new Date();
    await syncEventStatuses(Event, now);

    const totalEvents = await Event.countDocuments({ isApproved: true });
    const upcomingEvents = await Event.countDocuments({ isApproved: true, status: 'upcoming' });
    const ongoingEvents = await Event.countDocuments({ isApproved: true, status: 'ongoing' });
    const completedEvents = await Event.countDocuments({ isApproved: true, status: 'completed' });

    const attendanceAgg = await Attendance.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAttendees' } } },
    ]);
    const totalAttendance = attendanceAgg[0]?.total || 0;

    const cashAgg = await Donation.aggregate([
      { $match: { donationType: 'cash' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalCash = cashAgg[0]?.total || 0;
    const totalDonations = await Donation.countDocuments();

    const recentAnnouncements = await Announcement.find({ isPublished: true })
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcomingEventsList = await Event.find({ isApproved: true, status: 'upcoming', startDate: { $gte: startOfToday } })
      .sort({ startDate: 1 })
      .limit(5);

    let pendingUsers = 0;
    if (req.user.role === 'admin') {
      pendingUsers = await User.countDocuments({ status: 'pending' });
    }

    res.json({
      totalEvents,
      upcomingEvents,
      ongoingEvents,
      completedEvents,
      totalAttendance,
      totalCash,
      totalDonations,
      pendingUsers,
      recentAnnouncements,
      upcomingEventsList,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
