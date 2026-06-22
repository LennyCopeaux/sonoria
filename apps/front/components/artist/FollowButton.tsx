"use client";

import { useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";

import { fetchApi } from "@/lib/api";
import { notifyFollowChanged } from "@/lib/follow";

interface FollowButtonProps {
  artistId: string;
  following: boolean;
}

export function FollowButton({ artistId, following }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(following);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const next = !isFollowing;
    setIsFollowing(next); // optimistic
    try {
      await fetchApi(`/social/artists/${artistId}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      notifyFollowChanged();
    } catch {
      setIsFollowing(!next); // revert
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
        isFollowing
          ? "bg-surface-3 text-white ring-1 ring-line hover:bg-surface-2"
          : "bg-primary text-white hover:bg-primary-soft"
      }`}
    >
      {isFollowing ? (
        <>
          <UserCheck className="h-3.5 w-3.5" />
          Suivi
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Suivre
        </>
      )}
    </button>
  );
}
