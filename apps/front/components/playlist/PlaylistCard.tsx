import Link from "next/link";
import { ListMusic } from "lucide-react";

import { coverGradient } from "@/lib/cover";
import type { PlaylistSummary } from "@/lib/social-types";

interface PlaylistCardProps {
  playlist: PlaylistSummary;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const count = playlist.trackCount ?? 0;

  return (
    <Link href={`/playlist/${playlist.id}`} className="group flex flex-col gap-3">
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl ring-1 ring-line/60"
        style={{ backgroundImage: coverGradient(playlist.id) }}
      >
        <ListMusic className="h-10 w-10 text-white/70 transition-transform duration-300 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/15" />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-white group-hover:text-primary">
          {playlist.title}
        </h3>
        <p className="truncate text-xs text-muted">
          {count} titre{count > 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
