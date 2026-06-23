import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export class CoverUrlDto {
  @IsString()
  @MinLength(1)
  trackId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @IsIn(IMAGE_MIME_TYPES)
  mimeType!: (typeof IMAGE_MIME_TYPES)[number];
}
