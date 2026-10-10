import notification from "../Modals/notification.js";
import subscription from "../Modals/subscription.js";
import users from "../Modals/Auth.js";
import { emitToUser } from "../socket.js";

// Each signed-in client joins a socket room named after its user id (see
// "register" in socket.js), so notifications are pushed in real time and
// also stored for anyone who is offline.

async function deliver(docs) {
  if (docs.length === 0) return;
  const saved = await notification.insertMany(docs);
  for (const n of saved) {
    emitToUser(n.recipient.toString(), "notification", n.toObject());
  }
}

export async function notifyNewUpload(videoDoc) {
  if (!videoDoc?.uploader) return;
  const [subs, channel] = await Promise.all([
    subscription.find({ channel: videoDoc.uploader }).select("subscriber"),
    users.findById(videoDoc.uploader).select("channelname name image"),
  ]);
  await deliver(
    subs.map((s) => ({
      recipient: s.subscriber,
      type: "upload",
      actor: videoDoc.uploader,
      actorName: channel?.channelname || videoDoc.videochanel,
      actorImage: channel?.image || "",
      video: videoDoc._id,
      videoTitle: videoDoc.videotitle,
      thumbnail: videoDoc.thumbnail || "",
    }))
  );
}

export async function notifyNewSubscriber(channelId, subscriberId) {
  const subscriber = await users
    .findById(subscriberId)
    .select("channelname name image");
  await deliver([
    {
      recipient: channelId,
      type: "subscribe",
      actor: subscriberId,
      actorName: subscriber?.channelname || subscriber?.name || "Someone",
      actorImage: subscriber?.image || "",
    },
  ]);
}
