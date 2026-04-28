import { z } from "zod";

export const CreatePlaylistDto = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  trackIds: z.array(z.string().uuid()).default([]),
});

export type CreatePlaylistDto = z.infer<typeof CreatePlaylistDto>;
