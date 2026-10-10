import { toast } from "sonner";

// Public address of the frontend, used for links people share. Set
// NEXT_PUBLIC_APP_URL (e.g. https://yourtube.vercel.app) in production;
// otherwise the current origin is used.
export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return typeof window !== "undefined" ? window.location.origin : "";
}

const isLocalOnly = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/i.test(url);

export const callLink = (roomId: string) => `${getAppUrl()}/call/${roomId}`;

/**
 * Copy a call invite link. Warns when the link can only open on this
 * computer, which is the case while running the app locally.
 */
export async function copyCallLink(roomId: string) {
  const url = callLink(roomId);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    toast.error("Couldn't copy the link", { description: url });
    return url;
  }
  if (isLocalOnly(url)) {
    toast.warning("Link copied, but it only works on this computer", {
      description:
        "You're running YourTube locally. To call someone else, deploy the app (or set NEXT_PUBLIC_APP_URL to a public address). You can test by opening the link in another browser tab.",
      duration: 9000,
    });
  } else {
    toast.success("Call link copied", { description: "Share it with the people you want to call." });
  }
  return url;
}
