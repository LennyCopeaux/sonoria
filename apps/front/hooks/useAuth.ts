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
    refresh();

    const onAuthChange = () => refresh();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChange);
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {
      clearAccessToken();
    }

    window.location.href = "/";
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
