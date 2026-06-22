"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchApi, refreshSession } from "@/lib/api";
import {
  AUTH_CHANGED_EVENT,
  clearAccessToken,
  decodeToken,
  getAccessToken,
  getRole,
  isLoggedIn,
  type JwtPayload,
} from "@/lib/auth";

interface AuthState {
  user: JwtPayload | null;
  loggedIn: boolean;
  role: string | null;
}

const loggedOutState: AuthState = {
  user: null,
  loggedIn: false,
  role: null,
};

function readAuthState(): AuthState {
  const token = getAccessToken();
  const loggedIn = isLoggedIn();

  return {
    user: loggedIn && token ? decodeToken(token) : null,
    loggedIn,
    role: loggedIn ? getRole() : null,
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(loggedOutState);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(() => {
    setState(readAuthState());
    setIsReady(true);
  }, []);

  useEffect(() => {
    // If the cookie is present but the JWT has expired, try a silent refresh
    // before settling the auth state (keeps the session alive across reloads).
    const token = getAccessToken();
    if (token && !isLoggedIn()) {
      void refreshSession().then(() => refresh());
    } else {
      refresh();
    }

    const onAuthChange = () => refresh();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChange);
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST", authRedirect: false });
    } catch {
      // ignore — we clear locally regardless
    }
    clearAccessToken();
    window.location.href = "/auth/login";
  }, []);

  return {
    user: state.user,
    isLoggedIn: state.loggedIn,
    isReady,
    role: state.role,
    logout,
    refresh,
  };
}
