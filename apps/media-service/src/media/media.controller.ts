import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { UploadUrlDto } from './dto/upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { CoverUrlDto } from './dto/cover-url.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  createUploadUrl(@Body() dto: UploadUrlDto) {
    return this.mediaService.createUploadUrl(dto);
  }

  @Post('cover-url')
  createCoverUploadUrl(@Body() dto: CoverUrlDto) {
    return this.mediaService.createCoverUploadUrl(dto);
  }

  @Post('confirm-upload')
  confirmUpload(@Body() dto: ConfirmUploadDto) {
    return this.mediaService.confirmUpload(dto);
  }

  @Get('stream/:trackId')
  getStreamUrl(
    @Param('trackId') trackId: string,
    @Query('quality') quality: string | undefined,
    @Headers('x-user-role') userRole: string | undefined,
  ) {
    const resolvedQuality = quality === 'hq' ? 'hq' : 'std';
    return this.mediaService.getStreamUrl(trackId, resolvedQuality, userRole);
  }

  @Delete(':trackId')
  deleteMedia(@Param('trackId') trackId: string) {
    return this.mediaService.deleteTrackMedia(trackId);
  }
}
