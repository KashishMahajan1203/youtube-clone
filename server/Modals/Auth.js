import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  mobile: { type: String },
  joinedon: { type: Date, default: Date.now },
  plan: {
    type: String,
    enum: ["FREE", "BRONZE", "SILVER", "GOLD"],
    default: "FREE"
  },
  planExpiry: {
    type: Date,
    default: null
  }
});

export default mongoose.model("users", userschema);
