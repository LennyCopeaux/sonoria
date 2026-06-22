"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchApi } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { Profile } from "@/lib/social-types";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isLoggedIn()) {
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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}
