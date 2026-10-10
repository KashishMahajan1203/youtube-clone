import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { SUBSCRIPTIONS_CHANGED } from "./useSubscription";

// Channels the signed-in user subscribes to; refreshes whenever a subscribe
// button anywhere in the app changes state.
export function useSubscribedChannels() {
  const { user } = useUser();
  const [channels, setChannels] = useState<any[] | null>(null);

  const load = useCallback(() => {
    if (!user?._id) {
      setChannels(null);
      return;
    }
    axiosInstance
      .get(`/subscription/channels/${user._id}`)
      .then((res) => setChannels(res.data))
      .catch((err) => {
        console.error("Failed to load subscriptions:", err);
        setChannels([]);
      });
  }, [user?._id]);

  useEffect(() => {
    load();
    window.addEventListener(SUBSCRIPTIONS_CHANGED, load);
    return () => window.removeEventListener(SUBSCRIPTIONS_CHANGED, load);
  }, [load]);

  return channels;
}
