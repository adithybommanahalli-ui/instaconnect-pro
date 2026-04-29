const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gminsta";
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
