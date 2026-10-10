import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.js";
import video from "../Modals/video.js";

let t, alice, bob, v1, v2, playlistId;

const makeVideo = (title, uploader) =>
  video.create({
    videotitle: title, filename: "a.mp4", filepath: "uploads/a.mp4",
    filetype: "video/mp4", filesize: "1", videochanel: "Alice Cooks", uploader,
  });

before(async () => {
  t = await startTestServer();
  alice = await t.createUser({ name: "Alice", channelname: "Alice Cooks" });
  bob = await t.createUser({ name: "Bob" });
  v1 = String((await makeVideo("One", alice.id))._id);
  v2 = String((await makeVideo("Two", alice.id))._id);
});
after(() => t.stop());

test("creating a playlist requires a token and a title", async () => {
  assert.equal((await t.api("POST", "/playlist", { body: { title: "x" } })).status, 401);
  assert.equal((await t.api("POST", "/playlist", { token: bob.token, body: { title: "   " } })).status, 400);
});

test("create with a first video; owner comes from the token", async () => {
  const r = await t.api("POST", "/playlist", {
    token: bob.token,
    body: { title: "  Dinner  ", videoId: v1, userId: alice.id },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.title, "Dinner");
  assert.equal(r.data.owner, bob.id);
  assert.equal(r.data.visibility, "private");
  playlistId = r.data._id;
});

test("private playlists are only visible to the owner", async () => {
  const own = await t.api("GET", `/playlist/user/${bob.id}`, { token: bob.token });
  assert.equal(own.data.length, 1);
  assert.equal(own.data[0].count, 1);

  const other = await t.api("GET", `/playlist/user/${bob.id}?viewerId=${bob.id}`, { token: alice.token });
  assert.equal(other.data.length, 0);
  assert.equal((await t.api("GET", `/playlist/${playlistId}`)).status, 404);

  const open = await t.api("GET", `/playlist/${playlistId}`, { token: bob.token });
  assert.equal(open.data.videos[0].videotitle, "One");
  assert.equal(open.data.owner.name, "Bob");
});

test("only the owner can add, remove, edit or delete", async () => {
  const toggle = (token) =>
    t.api("POST", `/playlist/${playlistId}/video`, { token, body: { videoId: v2, userId: bob.id } });
  assert.equal((await toggle(alice.token)).status, 403);
  assert.equal((await t.api("PATCH", `/playlist/${playlistId}`, { token: alice.token, body: { title: "x" } })).status, 403);
  assert.equal((await t.api("DELETE", `/playlist/${playlistId}`, { token: alice.token, body: {} })).status, 403);

  assert.equal((await toggle(bob.token)).data.added, true);
  assert.equal((await toggle(bob.token)).data.added, false);
});

test("making a playlist public shares it", async () => {
  const r = await t.api("PATCH", `/playlist/${playlistId}`, {
    token: bob.token,
    body: { visibility: "public", title: "Dinner ideas" },
  });
  assert.equal(r.data.visibility, "public");
  const anon = await t.api("GET", `/playlist/${playlistId}`);
  assert.equal(anon.status, 200);
  assert.equal(anon.data.title, "Dinner ideas");
});

test("owner can delete", async () => {
  const r = await t.api("DELETE", `/playlist/${playlistId}`, { token: bob.token, body: {} });
  assert.equal(r.data.deleted, true);
  assert.equal((await t.api("GET", `/playlist/${playlistId}`)).status, 404);
});
