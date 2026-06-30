import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TrackStatus } from '@prisma/client';

export class InternalUpdateTrackDto {
  @IsEnum(TrackStatus)
  status!: TrackStatus;

  @IsOptional()
  @IsString()
  s3KeyStd?: string;

  @IsOptional()
  @IsString()
  s3KeyHq?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(1, { each: true })
  waveformJson?: number[];
}
