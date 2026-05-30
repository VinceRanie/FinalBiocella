const CollectionActivity = require('../models/CollectionActivity');

const toDateBoundary = (value, boundary) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (boundary === 'start') {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

exports.getAll = async (req, res) => {
  try {
    const { start_date, end_date, user_id, action } = req.query || {};
    const startDate = toDateBoundary(start_date, 'start');
    const endDate = toDateBoundary(end_date, 'end');

    const filter = {};
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) filter.created_at.$gte = startDate;
      if (endDate) filter.created_at.$lte = endDate;
    }

    const userId = Number(user_id);
    if (Number.isFinite(userId) && userId > 0) {
      filter.user_id = userId;
    }

    if (action) {
      filter.action = String(action).toLowerCase();
    }

    const items = await CollectionActivity.find(filter).sort({ created_at: 1 });
    res.json(items);
  } catch (err) {
    console.error('Failed to fetch collection activity:', err);
    res.status(500).json({ error: 'Failed to fetch collection activity' });
  }
};
