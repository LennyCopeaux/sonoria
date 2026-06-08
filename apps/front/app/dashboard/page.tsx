"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CreateTrackForm } from "@/components/track/CreateTrackForm";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, isReady, role } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!isLoggedIn) {
      router.replace("/auth/login");
      return;
    }
    if (role !== "ARTIST") {
      router.replace("/library");
    }
  }, [isReady, isLoggedIn, role, router]);

  if (!isReady || !isLoggedIn || role !== "ARTIST") {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold text-white">Publier un titre</h1>
      <p className="mb-8 text-sm text-zinc-400">
        Publiez un nouveau titre. Le fichier sera traité automatiquement après
        l&apos;envoi.
      </p>

      <CreateTrackForm />

      <p className="mt-8 text-sm text-zinc-500">
        Besoin de MinIO et du job-runner pour que le titre passe au statut{" "}
        <span className="text-zinc-400">READY</span>.{" "}
        <Link href="/" className="text-primary hover:underline">
          Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}
