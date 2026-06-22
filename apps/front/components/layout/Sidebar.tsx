"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Disc3,
  Home,
  Library,
  LogOut,
  Search,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const menu: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/search", label: "Rechercher", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isLoggedIn, role, logout } = useAuth();

  const library: NavItem[] = [
    { href: "/library", label: "Bibliothèque", icon: Library },
    ...(role === "ARTIST"
      ? [{ href: "/dashboard", label: "Publier un titre", icon: UploadCloud }]
      : []),
  ];

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

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface/40 p-4 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
          <Disc3 className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold tracking-tight">SONORIA</span>
      </Link>

      <nav className="flex flex-col gap-1">{menu.map(renderItem)}</nav>

      <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-muted-2">
        Bibliothèque
      </p>
      <nav className="mt-2 flex flex-col gap-1">{library.map(renderItem)}</nav>

      <div className="mt-auto border-t border-line pt-3">
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
