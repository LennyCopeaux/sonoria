import { clearAccessToken, getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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

export async function fetchApi<T>(
  path: string,
  options: FetchApiOptions = {},
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
    if (authRedirect) {
      clearAccessToken();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
    throw new ApiError("Non autorisé", 401);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || response.statusText, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
