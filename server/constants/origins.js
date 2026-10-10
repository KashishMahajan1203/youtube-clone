// Origins allowed to call the API and open sockets. Read lazily so values from
// .env (loaded in index.js) are available.
//
// Extra origins can be added with CLIENT_URL (comma-separated), e.g.
//   CLIENT_URL=https://my-app.vercel.app,https://www.mydomain.com
export function getAllowedOrigins() {
  const extra = (process.env.CLIENT_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, "")) // an origin never ends in "/"
    .filter(Boolean);
  return [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://youtube-final-six.vercel.app",
    "https://youtube-final-52sx.vercel.app",
    ...extra,
  ];
}
