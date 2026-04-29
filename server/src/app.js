const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Static uploads
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "uploads")));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "gminsta-api" }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
