"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchApi } from "@/lib/api";
import {
  AUTH_CHANGED_EVENT,
  clearAccessToken,
  decodeToken,
  getAccessToken,
  getRole,
  isLoggedIn,
  type JwtPayload,
} from "@/lib/auth";

function readAuthState() {
  const token = getAccessToken();
  const loggedIn = isLoggedIn();

  return {
    user: loggedIn && token ? decodeToken(token) : null,
    loggedIn,
    role: loggedIn ? getRole() : null,
  };
}

export function useAuth() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const onAuthChange = () => setRevision((value) => value + 1);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChange);
  }, []);

  void revision;

  const { user, loggedIn, role } = readAuthState();

  const logout = useCallback(async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {
      clearAccessToken();
    }

    window.location.href = "/";
  }, []);

  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  return {
    user: user as JwtPayload | null,
    isLoggedIn: loggedIn,
    role,
    logout,
    refresh,
  };
}
