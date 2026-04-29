const router = require("express").Router();
const c = require("../controllers/userController");
const { protect } = require("../middleware/auth");

router.get("/search", protect, c.search);
router.get("/suggestions", protect, c.suggestions);
router.get("/:username", c.getProfile);
router.put("/", protect, c.updateProfile);
router.post("/:id/follow", protect, c.follow);
router.delete("/:id/follow", protect, c.unfollow);

module.exports = router;
