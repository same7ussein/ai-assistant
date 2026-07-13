const Activity = require("../models/Activity");

exports.list = async (req, res) => {
  try {
    const includeAll = req.query.all === "true";
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 500)
      : 20;

    let query = Activity.find({ user: req.user.id })
      .populate("document", "title")
      .sort("-createdAt");

    if (!includeAll) query = query.limit(limit);

    const activities = await query;
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
