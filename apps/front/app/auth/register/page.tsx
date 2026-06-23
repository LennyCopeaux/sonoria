"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Headphones, Mic } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, fetchApi } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(1, "Nom requis").max(80, "Nom : 80 caractères maximum"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
  role: z.enum(["USER", "ARTIST"]),
});

type RegisterRole = "USER" | "ARTIST";

interface AuthResponse {
  access_token: string;
}

const roleOptions = [
  { value: "USER" as const, label: "Auditeur", icon: Headphones },
  { value: "ARTIST" as const, label: "Artiste", icon: Mic },
];

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
        if (err.status === 409) {
          setError("Cet email est déjà utilisé.");
        } else if (err.status === 400) {
          setError("Informations invalides. Vérifiez le formulaire.");
        } else {
          setError("Impossible de créer le compte. Réessayez plus tard.");
        }
      } else {
        setError("Une erreur est survenue. Réessayez plus tard.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Créer un compte</h1>
      <p className="mt-2 text-sm text-muted">
        Rejoignez SONORIA en tant qu&apos;auditeur ou artiste.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Nom"
          type="text"
          placeholder="Votre nom"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
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
          placeholder="8 caractères minimum"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Type de compte</span>
          <div className="grid grid-cols-2 gap-3">
            {roleOptions.map(({ value, label, icon: Icon }) => {
              const active = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary/60 bg-primary/10 text-white ring-2 ring-primary/20"
                      : "border-line text-muted hover:border-surface-3 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${active ? "text-primary" : "text-muted-2"}`}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary-soft ring-1 ring-primary/20">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
          {loading ? <Spinner size="sm" /> : "Créer mon compte"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:text-primary-soft"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
