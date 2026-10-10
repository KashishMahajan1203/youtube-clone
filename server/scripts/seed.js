/**
 * Seed demo data: a few creator channels, videos, comments, likes,
 * subscriptions and a playlist for the shared demo account.
 *
 *   npm run seed
 *
 * Re-running is safe: it removes everything owned by the seed accounts
 * (emails @demo.yourtube.dev) and recreates it. Real users' data is never
 * touched.
 *
 * Sample clips are short excerpts of open movies by the Blender Foundation
 * (Big Buck Bunny, Sintel — CC BY 3.0) and a public-domain jellyfish clip,
 * downloaded from test-videos.co.uk and stored like any upload (Cloudinary
 * when configured, otherwise ./uploads).
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import users from "../Modals/Auth.js";
import video from "../Modals/video.js";
import comment from "../Modals/comment.js";
import like from "../Modals/like.js";
import history from "../Modals/history.js";
import watchlater from "../Modals/watchlater.js";
import download from "../Modals/download.js";
import subscription from "../Modals/subscription.js";
import playlist from "../Modals/playlist.js";
import notification from "../Modals/notification.js";
import { persistUpload } from "../services/storage.js";
import { DEMO_EMAIL_DOMAIN, DEMO_USER } from "../constants/demo.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, "..", "uploads");

const CLIPS = {
  bunny: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_5MB.mp4",
  sintel: "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_5MB.mp4",
  jellyfish: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_5MB.mp4",
};

const CREATORS = [
  {
    key: "studio",
    email: `openmovies@${DEMO_EMAIL_DOMAIN}`,
    name: "Open Movie Studio",
    channelname: "Open Movie Studio",
    description: "Short cuts from open-source animated films made with Blender.",
  },
  {
    key: "ocean",
    email: `oceanlens@${DEMO_EMAIL_DOMAIN}`,
    name: "Ocean Lens",
    channelname: "Ocean Lens",
    description: "Calm underwater footage for focus and relaxation.",
  },
  {
    key: "frames",
    email: `framebyframe@${DEMO_EMAIL_DOMAIN}`,
    name: "Frame by Frame",
    channelname: "Frame by Frame",
    description: "Breaking down animation, colour and storytelling, one shot at a time.",
  },
];

const day = 24 * 60 * 60 * 1000;
const VIDEOS = [
  { by: "studio", clip: "bunny", category: "Entertainment", ago: 2, views: 18420, likes: 1210,
    title: "Big Buck Bunny — the opening scene",
    description: "The gentle opening of Big Buck Bunny, the Blender Foundation's open movie.\n\n© Blender Foundation | peach.blender.org — CC BY 3.0" },
  { by: "studio", clip: "sintel", category: "Entertainment", ago: 6, views: 9730, likes: 845,
    title: "Sintel — a moment from the open movie",
    description: "A short excerpt from Sintel, an open fantasy film about a girl searching for her dragon.\n\n© Blender Foundation | durian.blender.org — CC BY 3.0" },
  { by: "studio", clip: "bunny", category: "Comedy", ago: 15, views: 4310, likes: 390,
    title: "When the bunny finally wakes up",
    description: "Peace, quiet, and a very big rabbit.\n\n© Blender Foundation — CC BY 3.0" },
  { by: "ocean", clip: "jellyfish", category: "Science", ago: 1, views: 25890, likes: 2034,
    title: "Jellyfish drifting in HD — 10 second calm",
    description: "Ten seconds of jellyfish to reset your brain between tasks." },
  { by: "ocean", clip: "jellyfish", category: "Travel", ago: 9, views: 7120, likes: 512,
    title: "Inside a public aquarium: the jellyfish tank",
    description: "Glowing jellyfish, filmed up close." },
  { by: "ocean", clip: "jellyfish", category: "Lifestyle", ago: 30, views: 3150, likes: 288,
    title: "Focus loop: jellyfish ambience",
    description: "Put it on loop while you study or code." },
  { by: "frames", clip: "sintel", category: "Education", ago: 3, views: 11240, likes: 977,
    title: "How Sintel uses light to tell a story",
    description: "A look at lighting and colour in the open movie Sintel.\n\nFootage © Blender Foundation — CC BY 3.0" },
  { by: "frames", clip: "bunny", category: "Education", ago: 12, views: 6480, likes: 601,
    title: "Animation basics: squash and stretch in Big Buck Bunny",
    description: "One of the twelve principles of animation, in a ten-second clip.\n\nFootage © Blender Foundation — CC BY 3.0" },
  { by: "frames", clip: "sintel", category: "Technology", ago: 21, views: 2890, likes: 240,
    title: "Rendering Sintel: what an open movie pipeline looks like",
    description: "Blender, render farms and open assets.\n\nFootage © Blender Foundation — CC BY 3.0" },
];

const COMMENTS = [
  { on: 0, by: "demo", text: "Such a beautiful film, and it's open source!", city: "Bengaluru" },
  { on: 0, by: "frames", text: "The lighting in this opening is a masterclass.", city: "Mumbai" },
  { on: 3, by: "studio", text: "Watching this between meetings is my new habit.", city: "Delhi" },
  { on: 6, by: "demo", text: "Great breakdown — never noticed the colour shift before.", city: "Pune" },
  { on: 1, by: "ocean", text: "Sintel still gives me chills.", city: "Chandigarh" },
];

async function downloadClip(name, url) {
  const dest = path.join(UPLOADS, `seed-${name}.mp4`);
  if (!fs.existsSync(dest)) {
    console.log(`  downloading ${name}…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed for ${name}: ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  }
  return dest;
}

// Store a clip the same way real uploads are stored. persistUpload removes
// the local file after a Cloudinary upload, so hand it a copy.
async function storeClip(name, localPath) {
  const copy = path.join(UPLOADS, `seed-${name}-${Date.now()}.mp4`);
  fs.copyFileSync(localPath, copy);
  const stored = await persistUpload(copy, "video");
  if (stored === copy) {
    // Local storage: keep a stable file name instead of the timestamped copy.
    fs.unlinkSync(copy);
    return path.relative(path.join(__dirname, ".."), localPath).replace(/\\/g, "/");
  }
  return stored;
}

async function removeSeedData() {
  const seedUsers = await users.find({ email: new RegExp(`@${DEMO_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`) });
  const ids = seedUsers.map((u) => u._id);
  const idStrings = ids.map(String);
  const seedVideos = await video.find({ uploader: { $in: idStrings } }).select("_id");
  const vids = seedVideos.map((v) => v._id);

  await Promise.all([
    video.deleteMany({ _id: { $in: vids } }),
    comment.deleteMany({ $or: [{ userid: { $in: ids } }, { videoid: { $in: vids } }] }),
    like.deleteMany({ $or: [{ viewer: { $in: ids } }, { videoid: { $in: vids } }] }),
    history.deleteMany({ $or: [{ viewer: { $in: ids } }, { videoid: { $in: vids } }] }),
    watchlater.deleteMany({ $or: [{ viewer: { $in: ids } }, { videoid: { $in: vids } }] }),
    download.deleteMany({ $or: [{ viewer: { $in: ids } }, { videoid: { $in: vids } }] }),
    subscription.deleteMany({ $or: [{ subscriber: { $in: ids } }, { channel: { $in: ids } }] }),
    playlist.deleteMany({ owner: { $in: ids } }),
    notification.deleteMany({ $or: [{ recipient: { $in: ids } }, { actor: { $in: ids } }] }),
  ]);
  // Remove the creator accounts; the demo user is kept (same _id, so any
  // existing demo sessions stay valid) but reset below.
  await users.deleteMany({ _id: { $in: ids }, email: { $ne: DEMO_USER.email } });
  return seedVideos.length;
}

export async function seed() {
  fs.mkdirSync(UPLOADS, { recursive: true });

  console.log("Removing previous seed data…");
  const removed = await removeSeedData();
  console.log(`  removed ${removed} seed videos`);

  console.log("Preparing sample clips…");
  const stored = {};
  for (const [name, url] of Object.entries(CLIPS)) {
    stored[name] = await storeClip(name, await downloadClip(name, url));
  }

  console.log("Creating channels…");
  const creators = {};
  for (const c of CREATORS) {
    const { key, ...data } = c;
    creators[key] = await users.create(data);
  }
  const farFuture = new Date(Date.now() + 3650 * day);
  const demo = await users.findOneAndUpdate(
    { email: DEMO_USER.email },
    { $set: { ...DEMO_USER, plan: "GOLD", planExpiry: farFuture } },
    { upsert: true, new: true }
  );
  const people = { ...creators, demo };

  console.log("Creating videos…");
  const now = Date.now();
  const videoDocs = [];
  for (const v of VIDEOS) {
    const owner = creators[v.by];
    const created = new Date(now - v.ago * day);
    const doc = await video.create({
      videotitle: v.title,
      description: v.description,
      category: v.category,
      filename: `${v.clip}.mp4`,
      filepath: stored[v.clip],
      filetype: "video/mp4",
      filesize: "5MB",
      videochanel: owner.channelname,
      uploader: String(owner._id),
      views: v.views,
      Like: v.likes,
      thumbnail: "",
    });
    // timestamps are managed by mongoose; backdate directly for a realistic feed
    await video.collection.updateOne({ _id: doc._id }, { $set: { createdAt: created, updatedAt: created } });
    videoDocs.push(doc);
  }

  console.log("Adding comments, subscriptions and a playlist…");
  for (const [i, c] of COMMENTS.entries()) {
    const author = people[c.by];
    await comment.create({
      videoid: videoDocs[c.on]._id,
      userid: author._id,
      usercommented: author.name,
      commentbody: c.text,
      city: c.city,
      commentedon: new Date(now - (i + 1) * 3 * 60 * 60 * 1000),
    });
  }

  // Creators subscribe to each other; the demo user follows two channels.
  const subs = [
    [demo, creators.studio],
    [demo, creators.ocean],
    [creators.frames, creators.studio],
    [creators.ocean, creators.studio],
    [creators.studio, creators.frames],
  ];
  for (const [subscriber, channel] of subs) {
    await subscription.create({ subscriber: subscriber._id, channel: channel._id });
  }

  // The demo user's library
  await like.create({ viewer: demo._id, videoid: videoDocs[0]._id, type: "like" });
  await like.create({ viewer: demo._id, videoid: videoDocs[6]._id, type: "like" });
  await watchlater.create({ viewer: demo._id, videoid: videoDocs[7]._id });
  for (const i of [3, 0, 6]) {
    await history.create({ viewer: demo._id, videoid: videoDocs[i]._id });
  }
  await playlist.create({
    owner: demo._id,
    title: "Open movie favourites",
    description: "The best bits from Blender's open movies.",
    visibility: "public",
    videos: [videoDocs[0]._id, videoDocs[1]._id, videoDocs[6]._id, videoDocs[7]._id],
  });
  await notification.create({
    recipient: demo._id,
    type: "upload",
    actor: creators.ocean._id,
    actorName: creators.ocean.channelname,
    video: videoDocs[3]._id,
    videoTitle: videoDocs[3].videotitle,
  });

  console.log(`\nDone: ${CREATORS.length} channels, ${videoDocs.length} videos, demo account ${DEMO_USER.email}`);
}

// Run directly: `node scripts/seed.js`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.DB_URL) {
    console.error("DB_URL is not set. Add it to server/.env first.");
    process.exit(1);
  }
  mongoose
    .connect(process.env.DB_URL)
    .then(seed)
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
      console.error("Seed failed:", err);
      await mongoose.disconnect();
      process.exit(1);
    });
}
