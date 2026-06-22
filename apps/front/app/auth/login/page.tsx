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
    <div>
      <h1 className="text-3xl font-bold text-white">Content de vous revoir</h1>
      <p className="mt-2 text-sm text-muted">
        Connectez-vous pour retrouver votre bibliothèque.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="vous@exemple.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? (
          <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary-soft ring-1 ring-primary/20">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
          {loading ? <Spinner size="sm" /> : "Se connecter"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-primary hover:text-primary-soft"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
