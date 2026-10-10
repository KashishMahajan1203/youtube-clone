import { verifyToken } from "../services/token.js";

// Reads "Authorization: Bearer <jwt>".
function readToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

function authenticate({ required }) {
  return (req, res, next) => {
    const token = readToken(req);
    const userId = verifyToken(token);
    if (userId) {
      req.userId = userId;
      return next();
    }
    if (!required) return next();
    return res.status(401).json({
      message: token ? "Your session has expired. Please sign in again." : "Please sign in to continue.",
      code: "AUTH_REQUIRED",
    });
  };
}

/** Rejects the request with 401 unless a valid token is present. Sets req.userId. */
export const requireAuth = authenticate({ required: true });

/** Sets req.userId when a valid token is present; never rejects. */
export const optionalAuth = authenticate({ required: false });

/**
 * For routes like GET /history/:userId — only the signed-in user may read
 * their own data. Use after requireAuth.
 */
export const requireSelf = (param = "userId") => (req, res, next) => {
  if (req.params[param] !== req.userId) {
    return res.status(403).json({ message: "You can only access your own data." });
  }
  next();
};
