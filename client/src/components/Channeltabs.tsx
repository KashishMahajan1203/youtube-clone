import React from "react";
import { cn } from "@/lib/utils";

export type ChannelTab = "videos" | "about";

const tabs: { id: ChannelTab; label: string }[] = [
  { id: "videos", label: "Videos" },
  { id: "about", label: "About" },
];

const Channeltabs = ({
  active,
  onChange,
}: {
  active: ChannelTab;
  onChange: (tab: ChannelTab) => void;
}) => {
  return (
    <div className="border-b border-white/[0.08] px-4 sm:px-10">
      <div className="flex gap-6 overflow-x-auto" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            className={cn(
              "relative py-3.5 text-sm font-semibold transition-colors",
              active === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {active === tab.id && (
              <span className="bg-gradient-brand absolute inset-x-0 -bottom-px h-0.5 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Channeltabs;
