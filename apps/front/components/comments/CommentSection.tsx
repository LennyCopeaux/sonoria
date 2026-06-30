"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Comment, CommentsResponse } from "@/lib/social-types";

interface CommentSectionProps {
  trackId: string;
}

export function CommentSection({ trackId }: CommentSectionProps) {
  const { isLoggedIn } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<CommentsResponse>(
        `/social/tracks/${trackId}/comments`,
      );
      setComments(data.comments);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await fetchApi(`/social/tracks/${trackId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody("");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-500">Chargement des commentaires…</p>;
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-bold text-white">Commentaires</h2>

      {isLoggedIn ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="mb-6 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ajouter un commentaire…"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-primary"
          />
          <Button type="submit" disabled={submitting}>
            Publier
          </Button>
        </form>
      ) : (
        <p className="mb-4 text-sm text-zinc-500">
          Connectez-vous pour commenter.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4"
          >
            <p className="text-sm font-medium text-white">{comment.user.name}</p>
            <p className="mt-1 text-sm text-zinc-300">{comment.body}</p>
            {comment.replies?.map((reply) => (
              <div
                key={reply.id}
                className="ml-4 mt-3 border-l border-zinc-700 pl-4"
              >
                <p className="text-sm font-medium text-zinc-200">
                  {reply.user.name}
                </p>
                <p className="text-sm text-zinc-400">{reply.body}</p>
              </div>
            ))}
          </li>
        ))}
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun commentaire pour l&apos;instant.</p>
        ) : null}
      </ul>
    </section>
  );
}
