import { MoreVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// "⋮" menu with a single remove action, shared by the library lists.
export default function RowMenu({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground opacity-100 hover:bg-white/[0.08] hover:text-foreground md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
          aria-label="More actions"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-xl border-white/10 bg-popover/95 backdrop-blur-xl"
      >
        <DropdownMenuItem onClick={onRemove} className="gap-2 rounded-lg">
          <X className="size-4" />
          {label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
