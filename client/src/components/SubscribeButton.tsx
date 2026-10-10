import { BellRing } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export default function SubscribeButton({
  subscribed,
  onToggle,
  disabled,
  className,
}: {
  subscribed: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={subscribed}
      className={cn(
        "h-10 rounded-full px-5 font-semibold transition-all",
        subscribed
          ? "gap-2 border border-white/10 bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
          : "bg-white text-black hover:bg-white/90",
        className
      )}
    >
      {subscribed && <BellRing className="size-4" />}
      {subscribed ? "Subscribed" : "Subscribe"}
    </Button>
  );
}
