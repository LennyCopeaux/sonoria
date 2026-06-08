"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

const baseLinks = [
  { href: "/", label: "Accueil" },
  { href: "/library", label: "Bibliothèque" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isLoggedIn, role, logout } = useAuth();

  const links = [
    ...baseLinks,
    ...(role === "ARTIST"
      ? [{ href: "/dashboard", label: "Publier un titre" }]
      : []),
  ];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-4">
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-zinc-800 pt-4">
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            Déconnexion
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            Connexion
          </Link>
        )}
      </div>
    </aside>
  );
}
