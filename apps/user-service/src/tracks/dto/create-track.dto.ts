import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/flac',
  'audio/x-flac',
] as const;

export class CreateTrackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  genre?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsUrl()
  pochetteUrl?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @IsIn(AUDIO_MIME_TYPES)
  mimeType!: (typeof AUDIO_MIME_TYPES)[number];
}
