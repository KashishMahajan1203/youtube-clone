import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";

const gradients = [
  "from-rose-500 to-orange-400",
  "from-violet-500 to-fuchsia-400",
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-yellow-400",
  "from-indigo-500 to-blue-400",
  "from-pink-500 to-rose-400",
];

function pick(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return gradients[Math.abs(h) % gradients.length];
}

// Deterministic colourful fallback so channels without an image are still
// visually distinguishable.
export default function ChannelAvatar({
  name,
  src,
  className,
}: {
  name?: string;
  src?: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-9", className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br font-semibold uppercase text-white",
          pick(name)
        )}
      >
        {name?.trim()?.[0] || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
