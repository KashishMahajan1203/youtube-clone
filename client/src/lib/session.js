// Session token storage. The JWT is issued by the API after OTP verification
// and sent as "Authorization: Bearer <token>" on every request.
const TOKEN_KEY = "token";

// Fired when the API rejects the token (expired/invalid) so the app can sign out.
export const SESSION_EXPIRED = "session-expired";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) */
  }
}
