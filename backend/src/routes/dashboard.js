const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Announcement = require('../models/Announcement');
const Attendance = require('../models/Attendance');
const Donation = require('../models/Donation');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
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

// GET /api/dashboard/notifications
router.get('/notifications', protect, async (req, res) => {
  try {
    const role = req.user.role;
    const notifications = [];

    const pushItem = (item) => {
      notifications.push(item);
    };

    if (['admin', 'barangay_admin', 'imam'].includes(role)) {
      const pendingAppointments = await Appointment.find({ status: 'pending' })
        .populate('requestedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      if (pendingAppointments.length) {
        pushItem({
          id: 'pending-appointments',
          type: 'appointments',
          title: `${pendingAppointments.length} pending appointment${pendingAppointments.length > 1 ? 's' : ''}`,
          message: pendingAppointments[0]?.requestedBy?.name
            ? `Latest request from ${pendingAppointments[0].requestedBy.name}`
            : 'Review appointment requests',
          link: '/appointments',
          createdAt: pendingAppointments[0].createdAt,
        });
      }
    }

    const latestOwnAppointmentUpdate = await Appointment.findOne({
      requestedBy: req.user._id,
      status: { $in: ['approved', 'rejected', 'completed', 'cancelled'] },
    })
      .sort({ updatedAt: -1 })
      .select('title ticketNumber status updatedAt')
      .lean();

    if (latestOwnAppointmentUpdate) {
      const statusLabel = latestOwnAppointmentUpdate.status;
      const ticket = latestOwnAppointmentUpdate.ticketNumber || 'your appointment';
      pushItem({
        id: `appointment-update-${latestOwnAppointmentUpdate._id}`,
        type: 'appointments',
        title: `Appointment ${statusLabel}`,
        message: `${ticket} was marked ${statusLabel}`,
        link: '/appointments',
        createdAt: latestOwnAppointmentUpdate.updatedAt,
      });
    }

    if (role === 'admin') {
      const [pendingEvents, pendingUsers] = await Promise.all([
        Event.find({ isApproved: false }).sort({ createdAt: -1 }).limit(1).lean(),
        User.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(1).lean(),
      ]);

      const pendingEventCount = await Event.countDocuments({ isApproved: false });
      if (pendingEventCount > 0) {
        pushItem({
          id: 'pending-events',
          type: 'events',
          title: `${pendingEventCount} event${pendingEventCount > 1 ? 's' : ''} awaiting approval`,
          message: pendingEvents[0]?.title ? `Latest: ${pendingEvents[0].title}` : 'Review event submissions',
          link: '/events',
          createdAt: pendingEvents[0]?.createdAt || new Date(),
        });
      }

      const pendingUserCount = await User.countDocuments({ status: 'pending' });
      if (pendingUserCount > 0) {
        pushItem({
          id: 'pending-users',
          type: 'users',
          title: `${pendingUserCount} account${pendingUserCount > 1 ? 's' : ''} pending approval`,
          message: pendingUsers[0]?.name ? `Latest: ${pendingUsers[0].name}` : 'Review user approvals',
          link: '/users',
          createdAt: pendingUsers[0]?.createdAt || new Date(),
        });
      }
    }

    if (['leader', 'viewer'].includes(role)) {
      const upcoming = await Event.find({
        isApproved: true,
        status: 'upcoming',
        startDate: { $gte: new Date() },
      })
        .sort({ startDate: 1 })
        .limit(1)
        .lean();

      if (upcoming.length) {
        pushItem({
          id: 'upcoming-event',
          type: 'events',
          title: 'Upcoming approved event',
          message: `${upcoming[0].title} on ${new Date(upcoming[0].startDate).toLocaleDateString('en-US')}`,
          link: '/events',
          createdAt: upcoming[0].createdAt,
        });
      }
    }

    const latestAnnouncement = await Announcement.findOne({ isPublished: true })
      .sort({ createdAt: -1 })
      .select('title createdAt')
      .lean();

    if (latestAnnouncement) {
      pushItem({
        id: 'latest-announcement',
        type: 'announcements',
        title: 'Latest announcement',
        message: latestAnnouncement.title,
        link: '/announcements',
        createdAt: latestAnnouncement.createdAt,
      });
    }

    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      total: notifications.length,
      items: notifications.slice(0, 20),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
