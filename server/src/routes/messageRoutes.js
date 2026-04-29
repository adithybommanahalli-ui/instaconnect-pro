const router = require("express").Router();
const c = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

router.get("/", protect, c.conversations);
router.get("/:userId", protect, c.thread);
router.post("/", protect, c.send);

module.exports = router;
