import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { io as ioClient } from "socket.io-client";
import { startTestServer, wait } from "./helpers.js";

let t;
const sockets = [];

before(async () => {
  t = await startTestServer();
});
after(async () => {
  sockets.forEach((s) => s.close());
  await t.stop();
});

async function connect() {
  const s = ioClient(t.base, { transports: ["websocket"], forceNew: true });
  sockets.push(s);
  await new Promise((resolve) => s.on("connect", resolve));
  return s;
}

const emitAck = (socket, event, ...args) =>
  new Promise((resolve) => socket.emit(event, ...args, resolve));

/** Collect events of the given names on a socket. */
function record(socket, ...events) {
  const got = [];
  for (const e of events) socket.on(e, (data) => got.push({ event: e, data }));
  return got;
}

test("creating a room doesn't make the creator a participant", async () => {
  const creator = await connect();
  const { roomId } = await emitAck(creator, "create-room");
  assert.ok(roomId);

  const alice = await connect();
  const joined = await emitAck(alice, "join-room", roomId);
  assert.deepEqual(joined.participants, [alice.id]);
});

test("join → offer/answer/ICE are relayed only to the addressed peer", async () => {
  const host = await connect();
  const { roomId } = await emitAck(host, "create-room");

  const alice = await connect();
  const bob = await connect();
  const outsider = await connect();

  const aliceGot = record(alice, "user-joined", "offer", "ice-candidate");
  const bobGot = record(bob, "answer", "ice-candidate");
  const outsiderGot = record(outsider, "offer", "answer", "ice-candidate");

  await emitAck(alice, "join-room", roomId);
  const bobJoin = await emitAck(bob, "join-room", roomId);
  assert.deepEqual(bobJoin.participants, [alice.id, bob.id]);

  // Bob is the newcomer: he offers to Alice; Alice answers Bob.
  bob.emit("offer", { roomId, to: alice.id, offer: { type: "offer", sdp: "o" } });
  bob.emit("ice-candidate", { roomId, to: alice.id, candidate: { candidate: "c1" } });
  alice.emit("answer", { roomId, to: bob.id, answer: { type: "answer", sdp: "a" } });
  alice.emit("ice-candidate", { roomId, to: bob.id, candidate: { candidate: "c2" } });
  // Someone outside the call can't inject signalling into it.
  outsider.emit("offer", { roomId, to: alice.id, offer: { type: "offer", sdp: "evil" } });
  await wait(200);

  assert.ok(aliceGot.some((e) => e.event === "user-joined" && e.data === bob.id));
  const offers = aliceGot.filter((e) => e.event === "offer");
  assert.equal(offers.length, 1);
  assert.deepEqual(offers[0].data, { from: bob.id, offer: { type: "offer", sdp: "o" } });
  assert.ok(aliceGot.some((e) => e.event === "ice-candidate" && e.data.from === bob.id));

  assert.deepEqual(bobGot.find((e) => e.event === "answer").data, {
    from: alice.id,
    answer: { type: "answer", sdp: "a" },
  });
  assert.ok(bobGot.some((e) => e.event === "ice-candidate" && e.data.from === alice.id));

  assert.equal(outsiderGot.length, 0);
});

test("participants who disconnect are dropped from the room", async () => {
  const alice = await connect();
  const { roomId } = await emitAck(alice, "create-room");
  await emitAck(alice, "join-room", roomId);
  alice.close();
  await wait(100);

  const bob = await connect();
  const joined = await emitAck(bob, "join-room", roomId);
  assert.deepEqual(joined.participants, [bob.id]);
});
