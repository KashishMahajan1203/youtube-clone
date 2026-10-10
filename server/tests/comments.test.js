import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer, wait } from "./helpers.js";
import video from "../Modals/video.js";

let t, creator, alice, bob, videoId;

before(async () => {
  t = await startTestServer();
  creator = await t.createUser({ name: "Creator", channelname: "Creator" });
  alice = await t.createUser({ name: "Alice" });
  bob = await t.createUser({ name: "Bob" });
  const v = await video.create({
    videotitle: "Threads", filename: "a.mp4", filepath: "https://example.com/a.mp4",
    filetype: "video/mp4", filesize: "1", videochanel: "Creator", uploader: creator.id,
  });
  videoId = String(v._id);
});
after(() => t.stop());

const post = (user, body) =>
  t.api("POST", "/comment/postcomment", { token: user.token, body: { videoid: videoId, ...body } });
const list = async () => (await t.api("GET", `/comment/${videoId}`)).data;

test("replies attach to their top-level comment and notify its author", async () => {
  const aliceInbox = await t.listen(alice.token);
  const top = (await post(alice, { commentbody: "First!" })).data.item;
  const reply = (await post(bob, { commentbody: "Welcome", parentId: top._id })).data.item;
  assert.equal(reply.parent, top._id);

  // Replying to a reply still lands under the top-level comment.
  const nested = (await post(alice, { commentbody: "Thanks", parentId: reply._id })).data.item;
  assert.equal(nested.parent, top._id);

  await wait(200);
  const replies = aliceInbox.filter((n) => n.type === "reply");
  assert.equal(replies.length, 1); // from Bob; Alice replying in her own thread doesn't notify her
  assert.equal(replies[0].text, "Welcome");
  assert.equal(replies[0].video, videoId);
});

test("bad replies are rejected", async () => {
  assert.equal((await post(bob, { commentbody: "x", parentId: "000000000000000000000000" })).status, 404);
  assert.equal((await post(bob, { commentbody: "   " })).status, 400);
  assert.equal((await post(bob, { commentbody: "a".repeat(2001) })).status, 400);
  const r = await t.api("POST", "/comment/postcomment", {
    token: bob.token,
    body: { videoid: "000000000000000000000000", commentbody: "hi" },
  });
  assert.equal(r.status, 404);
});

test("only the creator can pin; one pinned comment, listed first", async () => {
  const a = (await post(alice, { commentbody: "Pin me" })).data.item;
  const b = (await post(bob, { commentbody: "No, me" })).data.item;
  assert.equal((await t.api("PATCH", `/comment/pin/${a._id}`, { token: alice.token })).status, 403);
  assert.equal((await t.api("PATCH", `/comment/pin/${a._id}`, { token: creator.token })).data.pinned, true);
  assert.equal((await list())[0]._id, a._id);

  await t.api("PATCH", `/comment/pin/${b._id}`, { token: creator.token });
  const after = await list();
  assert.equal(after[0]._id, b._id);
  assert.equal(after.filter((c) => c.pinned).length, 1);

  const reply = (await post(bob, { commentbody: "r", parentId: a._id })).data.item;
  assert.equal((await t.api("PATCH", `/comment/pin/${reply._id}`, { token: creator.token })).status, 400);
});

test("the creator can moderate; deleting a comment removes its replies", async () => {
  const top = (await post(alice, { commentbody: "Spam" })).data.item;
  await post(bob, { commentbody: "reply", parentId: top._id });
  assert.equal((await t.api("DELETE", `/comment/deletecomment/${top._id}`, { token: bob.token })).status, 404);
  assert.equal((await t.api("DELETE", `/comment/deletecomment/${top._id}`, { token: creator.token })).status, 200);
  const remaining = await list();
  assert.ok(!remaining.some((c) => c._id === top._id || c.parent === top._id));
});
