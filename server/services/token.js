import crypto from "crypto";
import jwt from "jsonwebtoken";

/* ===============================
   APP SESSION TOKENS (JWT)
   =============================== */

// Read lazily: this module is imported before dotenv runs in index.js.
const tokenTtl = () => process.env.JWT_EXPIRES_IN || "7d";
let devSecret = null;

function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  // Development fallback: random per process, so tokens stop working after a
  // restart. Set JWT_SECRET in .env to keep sessions across restarts.
  if (!devSecret) {
    devSecret = crypto.randomBytes(48).toString("hex");
    console.warn("JWT_SECRET not set — using a temporary secret (dev only).");
  }
  return devSecret;
}

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, getSecret(), {
    expiresIn: tokenTtl(),
    algorithm: "HS256",
  });
}

/** @returns {string|null} the user id, or null if the token is invalid/expired */
export function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/* ===============================
   FIREBASE ID TOKENS
   Verified against Google's public certificates, so no service account is
   needed. https://firebase.google.com/docs/auth/admin/verify-id-tokens
   =============================== */

const firebaseProjectId = () => process.env.FIREBASE_PROJECT_ID || "you-tube-ece31";
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certCache = { certs: null, expires: 0 };

async function getFirebaseCerts() {
  if (certCache.certs && Date.now() < certCache.expires) return certCache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Firebase certs: ${res.status}`);
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") || "")?.[1] || 3600);
  certCache = { certs: await res.json(), expires: Date.now() + maxAge * 1000 };
  return certCache.certs;
}

/**
 * Verify a Firebase Auth ID token.
 * @returns {Promise<object>} decoded claims (email, email_verified, phone_number, …)
 * @throws if the token is invalid
 */
export async function verifyFirebaseIdToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded?.header?.kid;
  if (!kid) throw new Error("Malformed ID token");
  const certs = await getFirebaseCerts();
  const cert = certs[kid];
  if (!cert) throw new Error("Unknown ID token key");
  const projectId = firebaseProjectId();
  return jwt.verify(idToken, cert, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });
}

// Called at startup so a missing JWT_SECRET in production fails immediately
// rather than on the first sign-in.
export function assertAuthConfig() {
  getSecret();
}
