import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.js";

let t, alice, bob, videoId;

before(async () => {
  t = await startTestServer();
  alice = await t.createUser({ name: "Alice", channelname: "Alice Cooks" });
  bob = await t.createUser({ name: "Bob" }); // no channel
});
after(() => t.stop());

test("uploading requires a token", async () => {
  assert.equal((await t.upload(null, { videotitle: "x" })).status, 401);
});

test("users without a channel can't upload", async () => {
  assert.equal((await t.upload(bob.token, { videotitle: "x" })).status, 403);
});

test("upload stores metadata; uploader and channel come from the token", async () => {
  const r = await t.upload(
    alice.token,
    {
      videotitle: "Pasta 101",
      description: "How to cook pasta",
      category: "Food",
      videochanel: "Spoofed Channel",
      uploader: bob.id,
    },
    { thumbnail: true }
  );
  assert.equal(r.status, 201);

  const all = (await t.api("GET", "/video/getall")).data;
  const v = all.find((x) => x.videotitle === "Pasta 101");
  assert.ok(v);
  videoId = v._id;
  assert.equal(v.uploader, alice.id);
  assert.equal(v.videochanel, "Alice Cooks");
  assert.equal(v.category, "Food");
  assert.equal(v.description, "How to cook pasta");
  assert.match(v.thumbnail, /thumb\.jpg$/);
});

test("unknown categories fall back to Other", async () => {
  await t.upload(alice.token, { videotitle: "Odd", category: "NotACategory" });
  const v = (await t.api("GET", "/video/getall")).data.find((x) => x.videotitle === "Odd");
  assert.equal(v.category, "Other");
});

test("anyone can stream a video, signed in or not", async () => {
  assert.equal((await fetch(`${t.base}/video/watch/${videoId}`)).status, 200);
});

test("history is recorded for the token's user and private to them", async () => {
  await t.api("POST", `/history/${videoId}`, { token: bob.token, body: { userId: alice.id } });
  assert.equal((await t.api("GET", `/history/${alice.id}`, { token: bob.token })).status, 403);
  const mine = await t.api("GET", `/history/${bob.id}`, { token: bob.token });
  assert.equal(mine.data.length, 1);
  assert.equal((await t.api("GET", `/history/${alice.id}`, { token: alice.token })).data.length, 0);
});

test("guest view counter responds", async () => {
  assert.equal((await t.api("POST", `/history/views/${videoId}`)).status, 200);
});

test("likes: like, switch to dislike, remove; state survives reload", async () => {
  let r = await t.api("POST", `/like/${videoId}`, { token: bob.token, body: {} });
  assert.deepEqual(
    { liked: r.data.liked, likes: r.data.likes, dislikes: r.data.dislikes },
    { liked: true, likes: 1, dislikes: 0 }
  );

  r = await t.api("POST", `/like/${videoId}`, { token: bob.token, body: { type: "dislike" } });
  assert.deepEqual(
    { liked: r.data.liked, disliked: r.data.disliked, likes: r.data.likes, dislikes: r.data.dislikes },
    { liked: false, disliked: true, likes: 0, dislikes: 1 }
  );

  r = await t.api("GET", `/like/status/${videoId}/${bob.id}`, { token: bob.token });
  assert.equal(r.data.disliked, true);

  // Disliked videos are not in the liked list.
  assert.equal((await t.api("GET", `/like/${bob.id}`, { token: bob.token })).data.length, 0);

  r = await t.api("POST", `/like/${videoId}`, { token: bob.token, body: { type: "dislike" } });
  assert.equal(r.data.dislikes, 0);
});

test("liked videos are private", async () => {
  assert.equal((await t.api("GET", `/like/${bob.id}`, { token: alice.token })).status, 403);
});

test("watch later toggles", async () => {
  let r = await t.api("POST", `/watch/${videoId}`, { token: bob.token, body: {} });
  assert.equal(r.data.watchlater, true);
  assert.equal((await t.api("GET", `/watch/${bob.id}`, { token: bob.token })).data.length, 1);
  r = await t.api("POST", `/watch/${videoId}`, { token: bob.token, body: {} });
  assert.equal(r.data.watchlater, false);
});

test("downloads have no daily limit", async () => {
  const v2 = (await t.api("GET", "/video/getall")).data.find((x) => x.videotitle === "Odd")._id;
  assert.equal((await t.api("POST", `/download/${videoId}`, { token: bob.token, body: {} })).data.downloaded, true);
  assert.equal((await t.api("POST", `/download/${v2}`, { token: bob.token, body: {} })).data.downloaded, true);
  const list = await t.api("GET", `/download/getall/${bob.id}`, { token: bob.token });
  assert.equal(list.data.length, 2);
  assert.equal((await t.api("GET", `/download/getall/${bob.id}`, { token: alice.token })).status, 403);
});

test("payment endpoints no longer exist", async () => {
  assert.equal((await t.api("POST", "/payment/create-order", { body: {} })).status, 404);
});
