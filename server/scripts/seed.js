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
 * from test-videos.co.uk.
 *
 * Media:
 * - With Cloudinary configured, the clips are uploaded there and Cloudinary
 *   renders a different frame of each video as its thumbnail image.
 * - Without it, the clips' public URLs are stored directly. Local file paths
 *   are deliberately not used: the database may be shared with a deployed
 *   server (e.g. MongoDB Atlas + Render) that wouldn't have those files.
 */
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
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
import { persistUpload, isCloudStorageEnabled, cloudinaryFrameUrl } from "../services/storage.js";
import { DEMO_EMAIL_DOMAIN, DEMO_USER } from "../constants/demo.js";
import { connectDB } from "../services/db.js";

dotenv.config();

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
const BLENDER = "© Blender Foundation | www.blender.org — CC BY 3.0";

// `at` is the second of the clip used for the thumbnail, so videos that
// share a source clip still look different on the home grid.
const VIDEOS = [
  { by: "studio", clip: "bunny", at: 1, category: "Entertainment", ago: 2, views: 18420, likes: 1210,
    title: "Big Buck Bunny — the opening scene",
    description: `The gentle opening of Big Buck Bunny, the Blender Foundation's open movie.\n\n${BLENDER}` },
  { by: "studio", clip: "sintel", at: 2, category: "Entertainment", ago: 6, views: 9730, likes: 845,
    title: "Sintel — a moment from the open movie",
    description: `A short excerpt from Sintel, an open fantasy film about a girl searching for her dragon.\n\n${BLENDER}` },
  { by: "studio", clip: "bunny", at: 7, category: "Comedy", ago: 15, views: 4310, likes: 390,
    title: "When the bunny finally wakes up",
    description: `Peace, quiet, and a very big rabbit.\n\n${BLENDER}` },
  { by: "studio", clip: "sintel", at: 8, category: "Entertainment", ago: 40, views: 15600, likes: 1320,
    title: "Sintel's final shot, ten seconds at a time",
    description: `Atmosphere, colour and a lot of snow.\n\n${BLENDER}` },
  { by: "ocean", clip: "jellyfish", at: 1, category: "Science", ago: 1, views: 25890, likes: 2034,
    title: "Jellyfish drifting in HD — 10 second calm",
    description: "Ten seconds of jellyfish to reset your brain between tasks." },
  { by: "ocean", clip: "jellyfish", at: 4, category: "Travel", ago: 9, views: 7120, likes: 512,
    title: "Inside a public aquarium: the jellyfish tank",
    description: "Glowing jellyfish, filmed up close." },
  { by: "ocean", clip: "jellyfish", at: 8, category: "Lifestyle", ago: 30, views: 3150, likes: 288,
    title: "Focus loop: jellyfish ambience",
    description: "Put it on loop while you study or code." },
  { by: "ocean", clip: "jellyfish", at: 6, category: "Music", ago: 18, views: 5400, likes: 610,
    title: "Lo-fi visuals: jellyfish for your study playlist",
    description: "Add your favourite lo-fi track and let it run." },
  { by: "frames", clip: "sintel", at: 4, category: "Education", ago: 3, views: 11240, likes: 977,
    title: "How Sintel uses light to tell a story",
    description: `A look at lighting and colour in the open movie Sintel.\n\nFootage ${BLENDER}` },
  { by: "frames", clip: "bunny", at: 4, category: "Education", ago: 12, views: 6480, likes: 601,
    title: "Animation basics: squash and stretch in Big Buck Bunny",
    description: `One of the twelve principles of animation, in a ten-second clip.\n\nFootage ${BLENDER}` },
  { by: "frames", clip: "sintel", at: 6, category: "Technology", ago: 21, views: 2890, likes: 240,
    title: "Rendering Sintel: what an open movie pipeline looks like",
    description: `Blender, render farms and open assets.\n\nFootage ${BLENDER}` },
  { by: "frames", clip: "bunny", at: 9, category: "Gaming", ago: 26, views: 8120, likes: 702,
    title: "Could Big Buck Bunny be a video game level?",
    description: `Looking at the forest set like a level designer would.\n\nFootage ${BLENDER}` },
];

const COMMENTS = [
  { on: 0, by: "demo", text: "Such a beautiful film, and it's open source!", city: "Bengaluru" },
  { on: 0, by: "frames", text: "The lighting in this opening is a masterclass.", city: "Mumbai" },
  { on: 4, by: "studio", text: "Watching this between meetings is my new habit.", city: "Delhi" },
  { on: 8, by: "demo", text: "Great breakdown — never noticed the colour shift before.", city: "Pune" },
  { on: 1, by: "ocean", text: "Sintel still gives me chills.", city: "Chandigarh" },
];

// Upload a clip to Cloudinary (via a temp file, which persistUpload removes).
async function uploadClip(name, url) {
  console.log(`  uploading ${name} to Cloudinary…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed for ${name}: ${res.status}`);
  const tmp = path.join(os.tmpdir(), `yourtube-seed-${name}-${Date.now()}.mp4`);
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  return persistUpload(tmp, "video");
}

async function prepareMedia() {
  const cloud = isCloudStorageEnabled();
  if (!cloud) {
    console.warn(
      "  Cloudinary not configured: storing the clips' public URLs directly.\n" +
        "  Set CLOUDINARY_* in .env to host them yourself with image thumbnails."
    );
  }
  const media = {};
  for (const [name, url] of Object.entries(CLIPS)) {
    media[name] = cloud ? await uploadClip(name, url) : url;
  }
  return { media, cloud };
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
  console.log("Removing previous seed data…");
  const removed = await removeSeedData();
  console.log(`  removed ${removed} seed videos`);

  console.log("Preparing sample clips…");
  const { media, cloud } = await prepareMedia();

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
      filepath: media[v.clip],
      filetype: "video/mp4",
      filesize: "5242880",
      videochanel: owner.channelname,
      uploader: String(owner._id),
      views: v.views,
      Like: v.likes,
      thumbnail: cloud ? cloudinaryFrameUrl(media[v.clip], v.at) : "",
      thumbnailTime: v.at,
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
  await like.create({ viewer: demo._id, videoid: videoDocs[8]._id, type: "like" });
  await watchlater.create({ viewer: demo._id, videoid: videoDocs[9]._id });
  for (const i of [4, 0, 8]) {
    await history.create({ viewer: demo._id, videoid: videoDocs[i]._id });
  }
  await playlist.create({
    owner: demo._id,
    title: "Open movie favourites",
    description: "The best bits from Blender's open movies.",
    visibility: "public",
    videos: [videoDocs[0]._id, videoDocs[1]._id, videoDocs[8]._id, videoDocs[9]._id],
  });
  await notification.create({
    recipient: demo._id,
    type: "upload",
    actor: creators.ocean._id,
    actorName: creators.ocean.channelname,
    video: videoDocs[4]._id,
    videoTitle: videoDocs[4].videotitle,
  });

  console.log(`\nDone: ${CREATORS.length} channels, ${videoDocs.length} videos, demo account ${DEMO_USER.email}`);
}

// Run directly: `node scripts/seed.js`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.DB_URL) {
    console.error("DB_URL is not set. Add it to server/.env first.");
    process.exit(1);
  }
  connectDB()
    .then(seed)
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
      console.error("Seed failed:", err);
      await mongoose.disconnect();
      process.exit(1);
    });
}
