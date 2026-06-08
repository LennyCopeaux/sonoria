import { z } from "zod";

export const SearchQueryDto = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["track", "artist"]).default("track"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchQueryDto = z.infer<typeof SearchQueryDto>;
