"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import { decodeToken, getAccessToken } from "@/lib/auth";
import type { PaginatedPlaylists, PlaylistSummary } from "@/lib/social-types";

export function usePlaylists() {
  const { isLoggedIn, isReady } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!isLoggedIn || !token) {
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
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isReady) return;
    void refresh();
  }, [isReady, refresh]);

  return { playlists, refresh };
}
