import Link from "next/link";
import { Disc3, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
          <Disc3 className="h-6 w-6" />
        </span>
        <span className="text-xl font-bold tracking-tight">SONORIA</span>
      </Link>

      <div className="flex flex-col items-center gap-2">
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="text-2xl font-bold">Page introuvable</h1>
        <p className="max-w-sm text-muted">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-soft"
      >
        <Home className="h-4 w-4" />
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
