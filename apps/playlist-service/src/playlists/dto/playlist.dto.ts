import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AddPlaylistTrackDto as AddPlaylistTrackSchema,
  UpdatePlaylistDto as UpdatePlaylistSchema,
} from '@sonoria/schemas';

export class CreatePlaylistDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdatePlaylistDto implements UpdatePlaylistSchema {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsUrl()
  coverUrl?: string | null;
}

export class AddPlaylistTrackDto implements AddPlaylistTrackSchema {
  @IsUUID()
  trackId!: string;

  @IsInt()
  @Min(0)
  position!: number;
}

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
