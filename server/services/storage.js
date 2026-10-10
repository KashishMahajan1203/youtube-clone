import fs from "fs/promises";
import { v2 as cloudinary } from "cloudinary";

// Uploaded media is stored on Cloudinary when it is configured, otherwise on
// local disk in ./uploads. Local disk is fine for development, but on hosts
// with an ephemeral filesystem (Render, Heroku…) files vanish on every deploy.
//
// Configure with either CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME +
// CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET.

let configured = null;

export function isCloudStorageEnabled() {
  if (configured !== null) return configured;
  const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  } else {
    // The SDK reads CLOUDINARY_URL by itself.
    configured = !!CLOUDINARY_URL;
    if (configured) cloudinary.config({ secure: true });
  }
  console.log(`Media storage: ${configured ? "Cloudinary" : "local disk (./uploads)"}`);
  return configured;
}

export const isRemoteUrl = (p) => /^https?:\/\//.test(p || "");

/**
 * Move a file multer saved to disk into permanent storage.
 * @param {string} localPath  path written by multer
 * @param {"video"|"image"} kind
 * @returns {Promise<string>} URL (Cloudinary) or the unchanged local path
 */
export async function persistUpload(localPath, kind) {
  if (!localPath || !isCloudStorageEnabled()) return localPath;

  const options = { resource_type: kind, folder: `yourtube/${kind}s` };
  try {
    const result =
      kind === "video"
        ? // upload_large streams in chunks, so videos near 100MB work too.
          await new Promise((resolve, reject) =>
            cloudinary.uploader.upload_large(
              localPath,
              { ...options, chunk_size: 20 * 1024 * 1024 },
              (err, res) => (err ? reject(err) : resolve(res))
            )
          )
        : await cloudinary.uploader.upload(localPath, options);
    return result.secure_url;
  } finally {
    await fs.unlink(localPath).catch(() => {});
  }
}

// Remove a local file left behind when an upload fails part-way.
export async function discardLocal(localPath) {
  if (localPath && !isRemoteUrl(localPath)) {
    await fs.unlink(localPath).catch(() => {});
  }
}
