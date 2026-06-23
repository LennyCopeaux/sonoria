"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListMusic,
  LogOut,
  Plus,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { usePlaylists } from "@/hooks/usePlaylists";
import { coverColor } from "@/lib/cover";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const browse: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/library", label: "Playlists", icon: ListMusic },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isLoggedIn, role, logout } = useAuth();
  const { playlists } = usePlaylists();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-surface-2 text-white"
            : "text-muted hover:bg-surface/60 hover:text-white"
        }`}
      >
        {active ? (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
        ) : null}
        <Icon
          className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "text-muted group-hover:text-white"}`}
        />
        {label}
      </Link>
    );
  };

  const sectionLabel = (text: string) => (
    <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-2">
      {text}
    </p>
  );

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface/40 p-4 md:flex">
      {sectionLabel("Parcourir")}
      <nav className="mt-2 flex flex-col gap-1">{browse.map(renderItem)}</nav>

      {role === "ARTIST" ? (
        <>
          <div className="mt-6">{sectionLabel("Artiste")}</div>
          <nav className="mt-2 flex flex-col gap-1">
            {renderItem({
              href: "/dashboard",
              label: "Publier un titre",
              icon: UploadCloud,
            })}
          </nav>
        </>
      ) : null}

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        {sectionLabel("Playlists")}
        <div className="mt-2 flex flex-col gap-1 overflow-y-auto">
          {playlists.map((playlist) => {
            const active = pathname === `/playlist/${playlist.id}`;
            return (
              <Link
                key={playlist.id}
                href={`/playlist/${playlist.id}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-surface-2 text-white"
                    : "text-muted hover:bg-surface/60 hover:text-white"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: coverColor(playlist.id) }}
                />
                <span className="truncate">{playlist.title}</span>
              </Link>
            );
          })}

          <Link
            href="/library"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface/60"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Create new playlist
          </Link>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface/60 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Déconnexion
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface/60 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0 rotate-180" />
            Connexion
          </Link>
        )}
      </div>
    </aside>
  );
}
