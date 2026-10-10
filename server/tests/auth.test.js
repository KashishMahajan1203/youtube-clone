import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.js";
import { DEMO_USER_EMAIL } from "../constants/demo.js";

let t, alice, bob;

before(async () => {
  t = await startTestServer();
  alice = await t.createUser({ name: "Alice", channelname: "Alice Cooks" });
  bob = await t.createUser({ name: "Bob" });
});
after(() => t.stop());

test("requests without a token are rejected with AUTH_REQUIRED", async () => {
  const r = await t.api("GET", "/user/me");
  assert.equal(r.status, 401);
  assert.equal(r.data.code, "AUTH_REQUIRED");
});

test("malformed tokens are rejected", async () => {
  const r = await t.api("GET", "/user/me", { token: "not.a.jwt" });
  assert.equal(r.status, 401);
});

test("/user/me returns the token's user", async () => {
  const r = await t.api("GET", "/user/me", { token: bob.token });
  assert.equal(r.status, 200);
  assert.equal(r.data.result.name, "Bob");
});

test("email-only login (the old account-takeover hole) is rejected", async () => {
  const r = await t.api("POST", "/user/login", { body: { email: alice.user.email } });
  assert.equal(r.status, 401);
  assert.equal(r.data.token, undefined);
});

test("a forged Firebase ID token is rejected", async () => {
  const r = await t.api("POST", "/user/login", { body: { idToken: "forged.token.value" } });
  assert.equal(r.status, 401);
});

test("users can't edit someone else's profile", async () => {
  const r = await t.api("PATCH", `/user/update/${alice.id}`, {
    token: bob.token,
    body: { channelname: "Hacked" },
  });
  assert.equal(r.status, 403);
});

test("users can edit their own profile", async () => {
  const r = await t.api("PATCH", `/user/update/${bob.id}`, {
    token: bob.token,
    body: { channelname: "Bob's Builds", description: "hi" },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.channelname, "Bob's Builds");
});

test("public channel endpoint hides private fields", async () => {
  const r = await t.api("GET", `/user/channel/${alice.id}`);
  assert.equal(r.status, 200);
  assert.equal(r.data.channelname, "Alice Cooks");
  assert.equal(r.data.email, undefined);
  assert.equal((await t.api("GET", "/user/channel/000000000000000000000000")).status, 404);
});

test("demo login issues a working session", async () => {
  const r = await t.api("POST", "/user/demo-login");
  assert.equal(r.status, 200);
  assert.equal(r.data.result.email, DEMO_USER_EMAIL);
  const me = await t.api("GET", "/user/me", { token: r.data.token });
  assert.equal(me.data.result.email, DEMO_USER_EMAIL);

  // Logging in again reuses the same account.
  const again = await t.api("POST", "/user/demo-login");
  assert.equal(again.data.result._id, r.data.result._id);
});

test("demo login can be disabled", async () => {
  process.env.ENABLE_DEMO_LOGIN = "false";
  try {
    assert.equal((await t.api("POST", "/user/demo-login")).status, 404);
  } finally {
    delete process.env.ENABLE_DEMO_LOGIN;
  }
});
