function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function deriveEventStatus(event, now = new Date()) {
  if (!event || !event.startDate) return event?.status || 'upcoming';
  if (event.status === 'cancelled') return 'cancelled';

  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : endOfDay(start);

  if (now < start) return 'upcoming';
  if (now > end) return 'completed';
  return 'ongoing';
}

async function syncEventStatuses(EventModel, now = new Date()) {
  const todayStart = startOfDay(now);

  await Promise.all([
    EventModel.updateMany(
      {
        startDate: { $gt: now },
        status: { $nin: ['cancelled', 'upcoming'] },
      },
      { $set: { status: 'upcoming' } }
    ),
    EventModel.updateMany(
      {
        startDate: { $lte: now },
        $or: [
          { endDate: { $exists: true, $ne: null, $gte: now } },
          {
            $and: [
              { $or: [{ endDate: { $exists: false } }, { endDate: null }] },
              { startDate: { $gte: todayStart } },
            ],
          },
        ],
        status: { $nin: ['cancelled', 'ongoing'] },
      },
      { $set: { status: 'ongoing' } }
    ),
    EventModel.updateMany(
      {
        $or: [
          { endDate: { $exists: true, $ne: null, $lt: now } },
          {
            $and: [
              { $or: [{ endDate: { $exists: false } }, { endDate: null }] },
              { startDate: { $lt: todayStart } },
            ],
          },
        ],
        status: { $nin: ['cancelled', 'completed'] },
      },
      { $set: { status: 'completed' } }
    ),
  ]);
}

module.exports = {
  deriveEventStatus,
  syncEventStatuses,
};
