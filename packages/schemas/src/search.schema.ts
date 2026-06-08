import { z } from "zod";

export const SearchQueryDto = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["track", "playlist", "user", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchQueryDto = z.infer<typeof SearchQueryDto>;
