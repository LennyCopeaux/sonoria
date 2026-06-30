import { z } from "zod";

export const CreatePlaylistDto = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
});

export type CreatePlaylistDto = z.infer<typeof CreatePlaylistDto>;
