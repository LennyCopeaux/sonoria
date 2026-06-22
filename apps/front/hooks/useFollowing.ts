"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchApi } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { FOLLOW_CHANGED_EVENT } from "@/lib/follow";

export interface FollowedArtist {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
}

export function useFollowing() {
  const [artists, setArtists] = useState<FollowedArtist[]>([]);

  const refresh = useCallback(async () => {
    if (!isLoggedIn()) {
      setArtists([]);
      return;
    }
    try {
      const data = await fetchApi<{ artists: FollowedArtist[] }>(
        "/social/me/following",
      );
      setArtists(data.artists);
    } catch {
      setArtists([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener(FOLLOW_CHANGED_EVENT, handler);
    return () => window.removeEventListener(FOLLOW_CHANGED_EVENT, handler);
  }, [refresh]);

  return { artists, refresh };
}
