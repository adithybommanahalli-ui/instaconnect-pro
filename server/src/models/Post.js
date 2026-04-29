const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const PostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    caption: { type: String, default: "", maxlength: 2000 },
    image: { type: String, default: "" },
    hashtags: [{ type: String, lowercase: true, trim: true, index: true }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],
  },
  { timestamps: true }
);

PostSchema.pre("save", function (next) {
  if (this.isModified("caption")) {
    const tags = (this.caption.match(/#(\w+)/g) || []).map((t) => t.slice(1).toLowerCase());
    this.hashtags = [...new Set(tags)];
  }
  next();
});

module.exports = mongoose.model("Post", PostSchema);
