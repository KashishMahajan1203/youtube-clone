import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer, wait } from "./helpers.js";
import video from "../Modals/video.js";

let t, alice, bob, videoId;

before(async () => {
  t = await startTestServer();
  alice = await t.createUser({ name: "Alice", channelname: "Alice Cooks" });
  bob = await t.createUser({ name: "Bob" });
  const v = await video.create({
    videotitle: "Existing", filename: "a.mp4", filepath: "uploads/a.mp4",
    filetype: "video/mp4", filesize: "1", videochanel: "Alice Cooks", uploader: alice.id,
  });
  videoId = String(v._id);
});
after(() => t.stop());

/* ---------------- subscriptions ---------------- */

test("subscribing requires a token", async () => {
  const r = await t.api("POST", `/subscription/${alice.id}`, { body: { userId: bob.id } });
  assert.equal(r.status, 401);
});

test("you can't subscribe to yourself (and a spoofed body userId is ignored)", async () => {
  const r = await t.api("POST", `/subscription/${alice.id}`, {
    token: alice.token,
    body: { userId: bob.id },
  });
  assert.equal(r.status, 400);
});

test("subscribe → status → channel list → realtime notification", async () => {
  const aliceInbox = await t.listen(alice.token);

  const r = await t.api("POST", `/subscription/${alice.id}`, { token: bob.token, body: {} });
  assert.deepEqual(r.data, { subscribed: true, count: 1 });

  const mine = await t.api("GET", `/subscription/status/${alice.id}`, { token: bob.token });
  assert.equal(mine.data.subscribed, true);
  const anon = await t.api("GET", `/subscription/status/${alice.id}`);
  assert.deepEqual(anon.data, { subscribed: false, count: 1 });

  const channels = await t.api("GET", `/subscription/channels/${bob.id}`, { token: bob.token });
  assert.equal(channels.data[0].channelname, "Alice Cooks");

  await wait(200);
  assert.ok(aliceInbox.some((n) => n.type === "subscribe" && n.actorName === "Bob"));
});

test("subscriptions are private", async () => {
  const r = await t.api("GET", `/subscription/channels/${bob.id}`, { token: alice.token });
  assert.equal(r.status, 403);
});

test("subscribers get a realtime notification for new uploads, plus a feed", async () => {
  const bobInbox = await t.listen(bob.token);
  assert.equal((await t.upload(alice.token, { videotitle: "Fresh upload" })).status, 201);
  await wait(300);
  assert.ok(bobInbox.some((n) => n.type === "upload" && n.videoTitle === "Fresh upload"));

  const feed = await t.api("GET", `/subscription/feed/${bob.id}`, { token: bob.token });
  assert.ok(feed.data.some((v) => v.videotitle === "Fresh upload"));
});

test("sockets that register with a bad token get nothing", async () => {
  const intruder = await t.listen("forged-token");
  await t.upload(alice.token, { videotitle: "Another one" });
  await wait(300);
  assert.equal(intruder.length, 0);
});

test("notifications: stored, private, mark as read", async () => {
  assert.equal((await t.api("GET", `/notification/${bob.id}`, { token: alice.token })).status, 403);
  const r = await t.api("GET", `/notification/${bob.id}`, { token: bob.token });
  assert.ok(r.data.unread >= 2);
  const read = await t.api("POST", `/notification/${bob.id}/read`, { token: bob.token, body: {} });
  assert.equal(read.data.unread, 0);
});

test("unsubscribe", async () => {
  const r = await t.api("POST", `/subscription/${alice.id}`, { token: bob.token, body: {} });
  assert.deepEqual(r.data, { subscribed: false, count: 0 });
});

/* ---------------- comments ---------------- */

test("comments: author comes from the token; only the author can edit/delete", async () => {
  assert.equal(
    (await t.api("POST", "/comment/postcomment", { body: { videoid: videoId, commentbody: "hi" } })).status,
    401
  );

  await t.api("POST", "/comment/postcomment", {
    token: bob.token,
    body: { videoid: videoId, commentbody: "Nice!", userid: alice.id, usercommented: "Alice" },
  });
  const [c] = (await t.api("GET", `/comment/${videoId}`)).data;
  assert.equal(c.usercommented, "Bob");
  assert.equal(c.userid, bob.id);

  const edit = (token, text) =>
    t.api("POST", `/comment/editcomment/${c._id}`, { token, body: { commentbody: text } });
  assert.equal((await edit(alice.token, "hacked")).status, 404);
  assert.equal((await t.api("DELETE", `/comment/deletecomment/${c._id}`, { token: alice.token })).status, 404);

  const ok = await edit(bob.token, "Nice!!");
  assert.equal(ok.data.commentbody, "Nice!!");
  assert.equal((await t.api("DELETE", `/comment/deletecomment/${c._id}`, { token: bob.token })).status, 200);
});

test("comment with two dislikes is removed automatically", async () => {
  const carol = await t.createUser({ name: "Carol" });
  await t.api("POST", "/comment/postcomment", {
    token: alice.token,
    body: { videoid: videoId, commentbody: "Controversial" },
  });
  const [c] = (await t.api("GET", `/comment/${videoId}`)).data;
  await t.api("PATCH", `/comment/dislike/${c._id}`, { token: bob.token, body: {} });
  const r = await t.api("PATCH", `/comment/dislike/${c._id}`, { token: carol.token, body: {} });
  assert.equal(r.data.deleted, true);
  assert.equal((await t.api("GET", `/comment/${videoId}`)).data.length, 0);
});
