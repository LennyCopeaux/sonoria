import { clearAccessToken, getAccessToken, setAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface FetchApiOptions extends RequestInit {
  authRedirect?: boolean;
}

// De-duplicate concurrent refreshes: if several requests 401 at once, they all
// await the same /auth/refresh call instead of hammering the endpoint.
let refreshPromise: Promise<boolean> | null = null;

export async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { access_token?: string };
        if (!data.access_token) return false;
        setAccessToken(data.access_token);
        return true;
      } catch {
        return false;
      }
    })();
    void refreshPromise.finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function fetchApi<T>(
  path: string,
  options: FetchApiOptions = {},
  retried = false,
): Promise<T> {
  const { authRedirect = true, ...requestOptions } = options;
  const token = getAccessToken();
  const headers = new Headers(requestOptions.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (requestOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    const isAuthCall = path.startsWith("/auth/");

    // Try a silent refresh once, then replay the original request.
    if (!isAuthCall && !retried) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return fetchApi<T>(path, options, true);
      }
    }

    if (authRedirect && !isAuthCall) {
      clearAccessToken();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
    throw new ApiError("Non autorisé", 401);
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text || response.statusText;
    try {
      const json = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(json.message)) {
        message = json.message.join(", ");
      } else if (typeof json.message === "string") {
        message = json.message;
      }
    } catch {
      // corps non-JSON : on garde le texte brut
    }
    throw new ApiError(message, response.status);
  }

  // 204, ou réponse au corps vide (ex. DELETE qui renvoie 200 sans body) :
  // on évite un JSON.parse sur une chaîne vide qui lèverait une exception.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
