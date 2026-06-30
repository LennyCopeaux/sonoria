import { IsString, MinLength } from 'class-validator';

export class ConfirmTrackUploadDto {
  @IsString()
  @MinLength(1)
  s3Key!: string;
}
