const Message = require("../models/Message");
const User = require("../models/User");

exports.conversations = async (req, res, next) => {
  try {
    const me = req.user._id;
    const msgs = await Message.find({ $or: [{ sender: me }, { receiver: me }] })
      .sort({ createdAt: -1 }).limit(500);
    const map = new Map();
    for (const m of msgs) {
      const other = String(m.sender) === String(me) ? String(m.receiver) : String(m.sender);
      if (!map.has(other)) map.set(other, { otherId: other, lastContent: m.content, lastAt: m.createdAt, unread: 0 });
      const c = map.get(other);
      if (String(m.receiver) === String(me) && m.status !== "read") c.unread++;
    }
    const ids = [...map.keys()];
    const profs = await User.find({ _id: { $in: ids } }).select("username profilePhoto displayName");
    for (const p of profs) {
      const c = map.get(String(p._id));
      if (c) { c.username = p.username; c.profilePhoto = p.profilePhoto; c.displayName = p.displayName; }
    }
    res.json({ conversations: [...map.values()].sort((a, b) => b.lastAt - a.lastAt) });
  } catch (err) { next(err); }
};

exports.thread = async (req, res, next) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    const msgs = await Message.find({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
    }).sort({ createdAt: 1 }).limit(500);

    await Message.updateMany(
      { sender: other, receiver: me, status: { $ne: "read" } },
      { $set: { status: "read" } }
    );
    res.json({ messages: msgs });
  } catch (err) { next(err); }
};

exports.send = async (req, res, next) => {
  try {
    const { receiver, content } = req.body;
    if (!receiver || !content) return res.status(400).json({ message: "receiver and content required" });
    const message = await Message.create({ sender: req.user._id, receiver, content, status: "sent" });

    // Push via socket if available
    const io = req.app.get("io");
    const sockets = req.app.get("userSockets");
    if (io && sockets) {
      const target = sockets.get(String(receiver));
      if (target) {
        io.to(target).emit("message:new", message);
        message.status = "delivered";
        await message.save();
      }
    }
    res.status(201).json({ message });
  } catch (err) { next(err); }
};
