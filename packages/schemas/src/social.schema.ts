import { z } from "zod";

export const CreateCommentDto = z.object({
  body: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(),
});

export type CreateCommentDto = z.infer<typeof CreateCommentDto>;

export const AddPlaylistTrackDto = z.object({
  trackId: z.string().uuid(),
  position: z.number().int().min(0),
});

export type AddPlaylistTrackDto = z.infer<typeof AddPlaylistTrackDto>;

export const UpdatePlaylistDto = z.object({
  title: z.string().min(1).max(120).optional(),
  isPublic: z.boolean().optional(),
  coverUrl: z.string().url().optional().nullable(),
});

export type UpdatePlaylistDto = z.infer<typeof UpdatePlaylistDto>;
