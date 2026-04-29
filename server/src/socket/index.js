const jwt = require("jsonwebtoken");
const Message = require("../models/Message");

function initSocket(io, app) {
  const userSockets = new Map(); // userId -> socketId
  app.set("io", io);
  app.set("userSockets", userSockets);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (e) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    userSockets.set(socket.userId, socket.id);
    console.log(`🔌 socket connected: ${socket.userId}`);

    socket.on("message:send", async ({ receiver, content }, cb) => {
      try {
        const msg = await Message.create({
          sender: socket.userId, receiver, content, status: "sent",
        });
        const targetSocketId = userSockets.get(String(receiver));
        if (targetSocketId) {
          io.to(targetSocketId).emit("message:new", msg);
          msg.status = "delivered";
          await msg.save();
        }
        socket.emit("message:sent", msg);
        cb && cb({ ok: true, message: msg });
      } catch (err) {
        cb && cb({ ok: false, error: err.message });
      }
    });

    socket.on("message:read", async ({ from }) => {
      await Message.updateMany(
        { sender: from, receiver: socket.userId, status: { $ne: "read" } },
        { $set: { status: "read" } }
      );
      const targetSocketId = userSockets.get(String(from));
      if (targetSocketId) io.to(targetSocketId).emit("message:read", { by: socket.userId });
    });

    socket.on("disconnect", () => {
      userSockets.delete(socket.userId);
      console.log(`❌ socket disconnected: ${socket.userId}`);
    });
  });
}

module.exports = initSocket;
