import { IsString, MinLength } from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  @MinLength(1)
  trackId!: string;

  @IsString()
  @MinLength(1)
  s3Key!: string;
}
