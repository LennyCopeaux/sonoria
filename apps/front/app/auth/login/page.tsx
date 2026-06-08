"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, fetchApi } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
});

interface AuthResponse {
  access_token: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Formulaire invalide");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchApi<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
        authRedirect: false,
      });
      setAccessToken(data.access_token);
      router.replace("/library");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Identifiants incorrects");
      } else {
        setError("Impossible de se connecter");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Connexion</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Accédez à votre bibliothèque SONORIA
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? <Spinner size="sm" /> : "Se connecter"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Pas encore de compte ?{" "}
          <Link href="/auth/register" className="text-primary hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
