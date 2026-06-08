"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

export function Header() {
  const router = useRouter();
  const { isLoggedIn, user, role, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-950/95 px-6 backdrop-blur">
      <Link href="/" className="shrink-0 text-xl font-bold text-primary">
        SONORIA
      </Link>

      <form onSubmit={handleSearch} className="mx-auto w-full max-w-xl">
        <Input
          type="search"
          placeholder="Rechercher des titres, artistes..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full"
        />
      </form>

      <div className="flex shrink-0 items-center gap-3">
        {isLoggedIn && unreadCount > 0 ? (
          <Badge variant="primary">{unreadCount} non lues</Badge>
        ) : null}

        {isLoggedIn && user ? (
          <div className="flex items-center gap-2">
            {role === "ARTIST" ? (
              <Link
                href="/dashboard"
                className="hidden rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/25 sm:inline-block"
              >
                Publier un titre
              </Link>
            ) : null}
            <span className="hidden text-sm text-zinc-400 md:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Déconnexion
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
