import dns from "dns";
import mongoose from "mongoose";

// Some networks (common on Windows with ISP/office DNS) refuse the SRV
// lookups that mongodb+srv:// URLs need, even though normal browsing works:
//   querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net
// If that happens, retry the lookup through public resolvers.
// Override the fallback list with DNS_SERVERS=1.1.1.1,8.8.8.8
async function ensureSrvResolvable(url) {
  if (!url.startsWith("mongodb+srv://")) return;
  const host = url.replace("mongodb+srv://", "").split("/")[0].split("@").pop().split("?")[0];
  const record = `_mongodb._tcp.${host}`;
  try {
    await dns.promises.resolveSrv(record);
  } catch (err) {
    const servers = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    console.warn(`DNS lookup for the database failed (${err.code}); retrying via ${servers.join(", ")}`);
    dns.setServers(servers);
    await dns.promises.resolveSrv(record); // throws if public DNS can't help either
  }
}

export async function connectDB(url = process.env.DB_URL) {
  if (!url) throw new Error("DB_URL is not set. Add it to server/.env first.");
  await ensureSrvResolvable(url);
  await mongoose.connect(url, { serverSelectionTimeoutMS: 15000 });
  return mongoose.connection;
}
