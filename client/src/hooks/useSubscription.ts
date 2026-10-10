import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

// Fired after any subscribe/unsubscribe so other parts of the UI (sidebar
// channel list, subscriptions feed) can refresh.
export const SUBSCRIPTIONS_CHANGED = "subscriptions-changed";

export function useSubscription(channelId?: string) {
  const { user } = useUser();
  const [subscribed, setSubscribed] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  const isOwnChannel = !!user && !!channelId && user._id === channelId;

  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;
    axiosInstance
      .get(`/subscription/status/${channelId}`, {
        params: user?._id ? { userId: user._id } : {},
      })
      .then((res) => {
        if (cancelled) return;
        setSubscribed(res.data.subscribed);
        setCount(res.data.count);
      })
      .catch((err) => console.error("Subscription status failed:", err));
    return () => {
      cancelled = true;
    };
  }, [channelId, user?._id]);

  const toggle = useCallback(async () => {
    if (!channelId || pending) return;
    if (!user) {
      toast.info("Sign in to subscribe to channels");
      return;
    }
    if (isOwnChannel) return;

    // Optimistic update, rolled back on failure.
    const prev = { subscribed, count };
    setSubscribed(!subscribed);
    setCount((c) => (c ?? 0) + (subscribed ? -1 : 1));
    setPending(true);
    try {
      const res = await axiosInstance.post(`/subscription/${channelId}`, {
        userId: user._id,
      });
      setSubscribed(res.data.subscribed);
      setCount(res.data.count);
      window.dispatchEvent(new Event(SUBSCRIPTIONS_CHANGED));
    } catch (err: any) {
      setSubscribed(prev.subscribed);
      setCount(prev.count);
      toast.error(err?.response?.data?.message || "Couldn't update subscription");
    } finally {
      setPending(false);
    }
  }, [channelId, pending, user, isOwnChannel, subscribed, count]);

  return { subscribed, count, toggle, pending, isOwnChannel };
}
