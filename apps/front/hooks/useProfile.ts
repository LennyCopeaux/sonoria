"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import type { Profile } from "@/lib/social-types";

export function useProfile() {
  const { isLoggedIn, isReady } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isReady || !isLoggedIn) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchApi<Profile>("/users/me");
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [isReady, isLoggedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}
