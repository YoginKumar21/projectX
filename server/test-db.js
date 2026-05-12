require('dotenv').config();
const connectDB = require('./config/db');
const mongoose = require('mongoose');

async function test() {
  await connectDB();
  if (mongoose.connection.readyState === 1) {
    console.log("DB Test: SUCCESS");
  } else {
    console.log("DB Test: FAILED");
  }
  process.exit(0);
}

test();
