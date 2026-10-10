import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.js";
import video from "../Modals/video.js";
import view from "../Modals/view.js";
import comment from "../Modals/comment.js";
import playlist from "../Modals/playlist.js";
import { cloudinaryHlsUrl } from "../services/storage.js";

let t, creator, fan, other, v1, v2;

const makeVideo = (owner, title, extra = {}) =>
  video.create({
    videotitle: title, filename: "a.mp4", filepath: "https://example.com/a.mp4",
    filetype: "video/mp4", filesize: "1", videochanel: "Creator", uploader: owner.id, ...extra,
  });

before(async () => {
  t = await startTestServer();
  creator = await t.createUser({ name: "Creator", channelname: "Creator" });
  fan = await t.createUser({ name: "Fan" });
  other = await t.createUser({ name: "Other", channelname: "Other" });
  v1 = String((await makeVideo(creator, "First", { Like: 3, views: 100 }))._id);
  v2 = String((await makeVideo(creator, "Second"))._id);
  await makeVideo(other, "Not mine");
});
after(() => t.stop());

test("studio requires sign-in", async () => {
  assert.equal((await t.api("GET", "/studio/overview")).status, 401);
  assert.equal((await t.api("GET", "/studio/videos")).status, 401);
});

test("views: repeat views by the same viewer within 30 minutes count once", async () => {
  const first = await t.api("POST", `/history/${v1}`, { token: fan.token, body: {} });
  assert.equal(first.data.counted, true);
  const again = await t.api("POST", `/history/${v1}`, { token: fan.token, body: {} });
  assert.equal(again.data.counted, false);

  // Anonymous viewers are keyed by IP: same machine, counted once.
  assert.equal((await t.api("POST", `/history/views/${v1}`)).data.counted, true);
  assert.equal((await t.api("POST", `/history/views/${v1}`)).data.counted, false);

  // A different viewer still counts.
  assert.equal((await t.api("POST", `/history/${v1}`, { token: other.token, body: {} })).data.counted, true);
  assert.equal((await video.findById(v1)).views, 103);
  assert.equal((await t.api("POST", "/history/views/not-an-id")).data.counted, false);
});

test("overview: totals, daily series and top videos for my channel only", async () => {
  await t.api("POST", `/history/${v2}`, { token: fan.token, body: {} });
  await t.api("POST", `/subscription/${creator.id}`, { token: fan.token, body: {} });
  await t.api("POST", `/like/${v2}`, { token: fan.token, body: { type: "like" } });
  await t.api("POST", "/comment/postcomment", { token: fan.token, body: { videoid: v1, commentbody: "Great" } });
  // An old view (40 days ago) is outside the 28-day window.
  await view.create({ video: v1, channel: creator.id, viewerKey: "user:old", createdAt: new Date(Date.now() - 40 * 864e5) });

  const r = await t.api("GET", "/studio/overview?days=28&tz=Asia/Kolkata", { token: creator.token });
  assert.equal(r.status, 200);
  assert.equal(r.data.timeZone, "Asia/Kolkata");
  assert.equal(r.data.series.views.length, 28);
  assert.equal(r.data.totals.videos, 2);
  assert.equal(r.data.totals.subscribers, 1);
  assert.equal(r.data.totals.comments, 1);
  assert.equal(r.data.totals.likes, 4); // 3 seeded + 1 new
  assert.equal(r.data.period.views.value, 4); // fan v1, anon v1, other v1, fan v2
  assert.equal(r.data.period.subscribers.value, 1);
  assert.equal(r.data.period.likes.value, 1);
  // Today's bucket holds this period's views.
  assert.equal(r.data.series.views.at(-1).value, 4);
  assert.equal(r.data.topVideos[0].video.videotitle, "First");
  assert.equal(r.data.topVideos[0].periodViews, 3);

  const bad = await t.api("GET", "/studio/overview?days=5&tz=Not/AZone", { token: creator.token });
  assert.equal(bad.data.days, 28);
  assert.equal(bad.data.timeZone, "UTC");

  const empty = await t.api("GET", "/studio/overview", { token: fan.token });
  assert.equal(empty.data.totals.videos, 0);
  assert.equal(empty.data.period.views.value, 0);
});

test("studio videos list includes comment counts", async () => {
  const r = await t.api("GET", "/studio/videos", { token: creator.token });
  assert.deepEqual(r.data.map((v) => v.videotitle).sort(), ["First", "Second"]);
  assert.equal(r.data.find((v) => v.videotitle === "First").comments, 1);
});

test("only the owner can edit a video; input is validated", async () => {
  const patch = (token, body) => t.api("PATCH", `/video/${v2}`, { token, body });
  assert.equal((await patch(null, { videotitle: "x" })).status, 401);
  assert.equal((await patch(other.token, { videotitle: "Hijacked" })).status, 404);
  assert.equal((await patch(creator.token, { videotitle: "  " })).status, 400);
  assert.equal((await patch(creator.token, { category: "Nope" })).status, 400);
  const ok = await patch(creator.token, { videotitle: " Renamed ", description: "New", category: "Music" });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.videotitle, "Renamed");
  assert.equal(ok.data.category, "Music");
});

test("deleting a video removes its comments, views and playlist entries", async () => {
  const list = await playlist.create({ owner: fan.id, title: "Mine", videos: [v1, v2] });
  assert.equal((await t.api("DELETE", `/video/${v1}`, { token: other.token })).status, 404);
  const r = await t.api("DELETE", `/video/${v1}`, { token: creator.token });
  assert.equal(r.status, 200);
  assert.equal(await video.exists({ _id: v1 }), null);
  assert.equal(await comment.countDocuments({ videoid: v1 }), 0);
  assert.equal(await view.countDocuments({ video: v1 }), 0);
  assert.deepEqual((await playlist.findById(list._id)).videos.map(String), [v2]);
});

test("HLS manifest URLs are derived for Cloudinary videos only", () => {
  assert.equal(
    cloudinaryHlsUrl("https://res.cloudinary.com/demo/video/upload/v17/yourtube/videos/abc.mp4"),
    "https://res.cloudinary.com/demo/video/upload/sp_auto/v17/yourtube/videos/abc.m3u8"
  );
  assert.equal(cloudinaryHlsUrl("https://example.com/a.mp4"), "");
  assert.equal(cloudinaryHlsUrl("uploads/a.mp4"), "");
});
