const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");

exports.create = async (req, res, next) => {
  try {
    const { caption } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : req.body.image || "";
    const post = await Post.create({ user: req.user._id, caption: caption || "", image });
    const populated = await post.populate("user", "username displayName profilePhoto");
    res.status(201).json({ post: populated });
  } catch (err) { next(err); }
};

exports.feed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "0", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const me = await User.findById(req.user._id);
    const ids = [...me.following, me._id];
    const posts = await Post.find({ user: { $in: ids } })
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate("user", "username displayName profilePhoto")
      .populate("comments.user", "username profilePhoto");
    res.json({ posts });
  } catch (err) { next(err); }
};

exports.explore = async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(60)
      .populate("user", "username profilePhoto");
    res.json({ posts });
  } catch (err) { next(err); }
};

exports.byUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });
    const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 })
      .populate("user", "username profilePhoto");
    res.json({ posts });
  } catch (err) { next(err); }
};

exports.byHashtag = async (req, res, next) => {
  try {
    const tag = req.params.tag.toLowerCase();
    const posts = await Post.find({ hashtags: tag }).sort({ createdAt: -1 })
      .populate("user", "username profilePhoto");
    res.json({ posts });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (String(post.user) !== String(req.user._id))
      return res.status(403).json({ message: "Forbidden" });
    await post.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) { next(err); }
};

exports.toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const idx = post.likes.findIndex((id) => String(id) === String(req.user._id));
    let liked;
    if (idx >= 0) { post.likes.splice(idx, 1); liked = false; }
    else {
      post.likes.push(req.user._id); liked = true;
      if (String(post.user) !== String(req.user._id)) {
        await Notification.create({ user: post.user, actor: req.user._id, type: "like", referenceId: post._id });
      }
    }
    await post.save();
    res.json({ liked, likes: post.likes.length });
  } catch (err) { next(err); }
};

exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Comment required" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.comments.push({ user: req.user._id, text: text.trim() });
    await post.save();
    if (String(post.user) !== String(req.user._id)) {
      await Notification.create({ user: post.user, actor: req.user._id, type: "comment", referenceId: post._id });
    }
    const populated = await post.populate("comments.user", "username profilePhoto");
    res.status(201).json({ comments: populated.comments });
  } catch (err) { next(err); }
};
