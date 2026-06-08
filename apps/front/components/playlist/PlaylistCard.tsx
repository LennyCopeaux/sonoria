import Link from "next/link";

import type { PlaylistSummary } from "@/lib/social-types";

interface PlaylistCardProps {
  playlist: PlaylistSummary;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex h-24 items-center justify-center rounded-lg bg-zinc-800 text-2xl text-zinc-500">
        📋
      </div>
      <h3 className="font-semibold text-white">{playlist.title}</h3>
      <p className="text-sm text-zinc-400">
        {playlist.trackCount ?? 0} titre{(playlist.trackCount ?? 0) > 1 ? "s" : ""}
      </p>
    </Link>
  );
}
