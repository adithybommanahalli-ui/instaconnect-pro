const router = require("express").Router();
const c = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

router.get("/", protect, c.list);
router.post("/seen", protect, c.markAllSeen);

module.exports = router;
