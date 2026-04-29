const User = require("../models/User");
const { signToken } = require("../utils/token");

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "username, email and password required" });

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (exists) return res.status(409).json({ message: "User with that email or username already exists" });

    const user = await User.create({ username, email, password, displayName: displayName || username });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password required" });
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = signToken(user._id);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.me = async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
};
