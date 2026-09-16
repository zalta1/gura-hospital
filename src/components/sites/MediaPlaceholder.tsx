import { Image as ImageIcon, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  kind?: "image" | "video";
  className?: string;
};

/** Reserved slot for client-supplied photography or hero video. */
export function MediaPlaceholder({ label, kind = "image", className }: Props) {
  const Icon = kind === "video" ? Video : ImageIcon;
  return (
    <div
      className={cn(
        "media-placeholder flex items-center justify-center border border-border/70",
        className,
      )}
      aria-label={label}
      role="img"
    >
      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <Icon className="size-6 text-muted-foreground" strokeWidth={1.5} />
        <span className="nav-label text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
