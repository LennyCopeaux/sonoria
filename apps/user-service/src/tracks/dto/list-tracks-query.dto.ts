import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TrackStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class ListTracksQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  artistId?: string;

  @IsOptional()
  @IsEnum(TrackStatus)
  status?: TrackStatus;
}
