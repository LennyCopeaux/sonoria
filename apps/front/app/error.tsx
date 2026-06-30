"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Disc3, Home, RotateCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
          <Disc3 className="h-6 w-6" />
        </span>
        <span className="text-xl font-bold tracking-tight">SONORIA</span>
      </Link>

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="max-w-sm text-muted">
          Quelque chose s&apos;est mal passé. Réessayez ou revenez à l&apos;accueil.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-soft"
        >
          <RotateCw className="h-4 w-4" />
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-6 py-2.5 text-sm font-medium text-white ring-1 ring-line transition-colors hover:bg-surface-3"
        >
          <Home className="h-4 w-4" />
          Accueil
        </Link>
      </div>
    </div>
  );
}
