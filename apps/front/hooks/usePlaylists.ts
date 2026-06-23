"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchApi } from "@/lib/api";
import { decodeToken, getAccessToken, isLoggedIn } from "@/lib/auth";
import type { PaginatedPlaylists, PlaylistSummary } from "@/lib/social-types";

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!isLoggedIn() || !token) {
      setPlaylists([]);
      return;
    }
    try {
      const data = await fetchApi<PaginatedPlaylists>("/playlists/public");
      const userId = decodeToken(token)?.sub;
      const mine = userId
        ? data.playlists.filter((p) => p.ownerId === userId)
        : [];
      setPlaylists(mine);
    } catch {
      setPlaylists([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { playlists, refresh };
}
