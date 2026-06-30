import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/flac',
  'audio/x-flac',
] as const;

export class UploadUrlDto {
  @IsString()
  @MinLength(1)
  trackId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @IsIn(AUDIO_MIME_TYPES)
  mimeType!: (typeof AUDIO_MIME_TYPES)[number];
}
