const User = require("../models/User");
const Notification = require("../models/Notification");

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .populate("followers", "username profilePhoto displayName")
      .populate("following", "username profilePhoto displayName");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { displayName, bio, profilePhoto, isPrivate } = req.body;
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;
    if (isPrivate !== undefined) updates.isPrivate = !!isPrivate;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.search = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ users: [] });
    const re = new RegExp(q, "i");
    const users = await User.find({ $or: [{ username: re }, { displayName: re }] })
      .select("username displayName profilePhoto bio").limit(20);
    res.json({ users });
  } catch (err) { next(err); }
};

exports.follow = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (String(target._id) === String(req.user._id))
      return res.status(400).json({ message: "Cannot follow yourself" });

    const me = await User.findById(req.user._id);
    if (me.following.some((id) => String(id) === String(target._id)))
      return res.status(409).json({ message: "Already following" });

    me.following.push(target._id);
    target.followers.push(me._id);
    await Promise.all([me.save(), target.save()]);
    await Notification.create({ user: target._id, actor: me._id, type: "follow" });

    res.json({ message: "Followed" });
  } catch (err) { next(err); }
};

exports.unfollow = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    const me = await User.findById(req.user._id);
    me.following = me.following.filter((id) => String(id) !== String(target._id));
    target.followers = target.followers.filter((id) => String(id) !== String(me._id));
    await Promise.all([me.save(), target.save()]);
    res.json({ message: "Unfollowed" });
  } catch (err) { next(err); }
};

exports.suggestions = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id);
    const exclude = [me._id, ...me.following];
    const users = await User.find({ _id: { $nin: exclude } })
      .select("username displayName profilePhoto").limit(5);
    res.json({ users });
  } catch (err) { next(err); }
};
