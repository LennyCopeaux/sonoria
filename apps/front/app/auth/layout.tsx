import Link from "next/link";
import { Disc3, Headphones, Radio, Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Brand panel — hidden on small screens */}
      <aside className="relative hidden w-1/2 overflow-hidden lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-background" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(40rem 30rem at 20% 20%, rgba(239,68,68,0.25), transparent 60%), radial-gradient(40rem 30rem at 80% 90%, rgba(99,102,241,0.18), transparent 55%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <Link href="/" prefetch={false} className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
              <Disc3 className="h-6 w-6" />
            </span>
            <span className="text-2xl font-bold tracking-tight">SONORIA</span>
          </Link>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              Le son qui vous ressemble.
            </h1>
            <p className="mt-4 text-muted">
              Des millions de titres, vos playlists, vos artistes. Tout au même
              endroit.
            </p>

            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-center gap-3 text-foreground/90">
                <Headphones className="h-5 w-5 text-primary" />
                Streaming haute qualité, sans interruption.
              </li>
              <li className="flex items-center gap-3 text-foreground/90">
                <Radio className="h-5 w-5 text-primary" />
                Recommandations taillées pour vos goûts.
              </li>
              <li className="flex items-center gap-3 text-foreground/90">
                <Sparkles className="h-5 w-5 text-primary" />
                Suivez vos artistes et créez vos playlists.
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-2">
            © {new Date().getFullYear()} Sonoria. Tous droits réservés.
          </p>
        </div>
      </aside>

      {/* Form area */}
      <main className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <Link
          href="/"
          prefetch={false}
          className="mb-8 flex items-center gap-2 lg:hidden"
          aria-label="Accueil"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <Disc3 className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold">SONORIA</span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
