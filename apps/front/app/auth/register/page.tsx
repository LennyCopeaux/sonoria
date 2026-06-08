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

const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Nom requis")
    .max(80, "Nom : 80 caractères maximum"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
  role: z.enum(["USER", "ARTIST"]),
});

type RegisterRole = "USER" | "ARTIST";

interface AuthResponse {
  access_token: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterRole>("USER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ name, email, password, role });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Formulaire invalide");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchApi<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
          role: parsed.data.role,
        }),
        authRedirect: false,
      });
      setAccessToken(data.access_token);
      router.push("/library");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Impossible de créer le compte");
      } else {
        setError("Une erreur est survenue");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Inscription</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Rejoignez SONORIA en tant qu&apos;auditeur ou artiste
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nom"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-300">Type de compte</span>
            <div className="grid grid-cols-2 gap-2">
              {(["USER", "ARTIST"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    role === option
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {option === "USER" ? "Auditeur" : "Artiste"}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? <Spinner size="sm" /> : "Créer mon compte"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Déjà inscrit ?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
