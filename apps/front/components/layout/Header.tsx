"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Bell, Disc3, Heart, Search } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";

function roleLabel(role: string | null): string {
  switch (role) {
    case "SUBSCRIBER":
      return "Premium";
    case "ARTIST":
      return "Artiste";
    case "ADMIN":
      return "Admin";
    default:
      return "Membre";
  }
}

export function Header() {
  const router = useRouter();
  const { isLoggedIn, user, role } = useAuth();
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const displayName = profile?.name ?? user?.email ?? "";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  return (
    <header className="flex h-20 shrink-0 items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2.5"
        aria-label="Accueil"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
          <Disc3 className="h-5 w-5" />
        </span>
        <span className="hidden text-lg font-bold tracking-tight sm:inline">
          SONORIA
        </span>
      </Link>

      <form onSubmit={handleSearch} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
        <input
          type="search"
          placeholder="Rechercher un titre, un artiste..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 w-full rounded-full border border-line bg-surface-2 pl-11 pr-4 text-sm text-white placeholder:text-muted-2 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {isLoggedIn && user ? (
          <>
            <Link href="/library" className="relative hidden sm:block" aria-label="Notifications">
              <IconButton variant="surface" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </IconButton>
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>

            <Link href="/library" className="hidden sm:block" aria-label="Mes favoris">
              <IconButton variant="surface" aria-label="Mes favoris">
                <Heart className="h-5 w-5" />
              </IconButton>
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-full bg-surface-2 py-1 pl-1 pr-1 transition-colors hover:bg-surface-3 sm:pr-3"
            >
              {profile?.avatarUrl ? (
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={profile.avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </span>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-soft text-sm font-bold text-white">
                  {initial}
                </span>
              )}
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="max-w-[10rem] truncate text-sm font-semibold text-white">
                  {displayName}
                </span>
                <Badge variant="primary" className="mt-0.5 w-fit px-1.5 py-0">
                  {roleLabel(role)}
                </Badge>
              </div>
            </Link>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-soft"
          >
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
