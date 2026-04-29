const Notification = require("../models/Notification");

exports.list = async (req, res, next) => {
  try {
    const items = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 }).limit(100)
      .populate("actor", "username profilePhoto");
    res.json({ notifications: items });
  } catch (err) { next(err); }
};

exports.markAllSeen = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, seen: false }, { $set: { seen: true } });
    res.json({ message: "ok" });
  } catch (err) { next(err); }
};
