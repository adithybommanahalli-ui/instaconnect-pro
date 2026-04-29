const router = require("express").Router();
const c = require("../controllers/postController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/feed", protect, c.feed);
router.get("/explore", c.explore);
router.get("/user/:username", c.byUser);
router.get("/hashtag/:tag", c.byHashtag);
router.post("/", protect, upload.single("image"), c.create);
router.delete("/:id", protect, c.remove);
router.post("/:id/like", protect, c.toggleLike);
router.post("/:id/comments", protect, c.addComment);

module.exports = router;
