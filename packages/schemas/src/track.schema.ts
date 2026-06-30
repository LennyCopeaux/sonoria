import { z } from "zod";

const audioMimeType = z.enum([
  "audio/mpeg",
  "audio/wav",
  "audio/flac",
  "audio/x-flac",
]);

const trackStatus = z.enum(["PENDING", "PROCESSING", "READY", "ERROR"]);

export const CreateTrackDto = z.object({
  title: z.string().min(1).max(200),
  genre: z.string().max(60).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  pochetteUrl: z.string().url().optional(),
  filename: z.string().min(1).max(255),
  mimeType: audioMimeType,
});

export const UpdateTrackDto = z.object({
  title: z.string().min(1).max(200).optional(),
  genre: z.string().max(60).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  pochetteUrl: z.string().url().optional(),
});

export const InternalTrackUpdateDto = z.object({
  status: trackStatus,
  s3KeyStd: z.string().optional(),
  s3KeyHq: z.string().optional(),
  waveformJson: z.array(z.number().min(0).max(1)).length(200).optional(),
});

export const ListTracksQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  genre: z.string().max(60).optional(),
  artistId: z.string().optional(),
  status: trackStatus.optional(),
});

export type CreateTrackDto = z.infer<typeof CreateTrackDto>;
export type UpdateTrackDto = z.infer<typeof UpdateTrackDto>;
export type InternalTrackUpdateDto = z.infer<typeof InternalTrackUpdateDto>;
export type ListTracksQueryDto = z.infer<typeof ListTracksQueryDto>;
