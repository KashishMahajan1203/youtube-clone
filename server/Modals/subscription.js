import mongoose from "mongoose";
const subscriptionschema = mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One subscription per (subscriber, channel) pair.
subscriptionschema.index({ subscriber: 1, channel: 1 }, { unique: true });
subscriptionschema.index({ channel: 1 });

export default mongoose.model("subscription", subscriptionschema);
