import { z } from "zod";

export const CreateTrackDto = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  album: z.string().max(200).optional(),
  durationSec: z.number().int().nonnegative(),
  genre: z.string().max(60).optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
});

export const UpdateTrackDto = CreateTrackDto.partial();

export type CreateTrackDto = z.infer<typeof CreateTrackDto>;
export type UpdateTrackDto = z.infer<typeof UpdateTrackDto>;
