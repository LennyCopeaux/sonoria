import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types';
import { PlaylistsService } from './playlists.service';
import {
  AddPlaylistTrackDto,
  CreatePlaylistDto,
  PaginationQueryDto,
  UpdatePlaylistDto,
} from '../social/dto/social.dto';

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Controller('playlists')
@UseGuards(AuthGuard)
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePlaylistDto) {
    return this.playlists.create(user.sub, dto);
  }

  @Get('public')
  listPublic(@Query() query: PaginationQueryDto) {
    return this.playlists.listPublic(query.page, query.limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.playlists.findById(id, req.user?.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.playlists.update(id, user.sub, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.playlists.remove(id, user.sub);
  }

  @Post(':id/tracks')
  addTrack(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPlaylistTrackDto,
  ) {
    return this.playlists.addTrack(id, user.sub, dto);
  }

  @Delete(':id/tracks/:trackId')
  removeTrack(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ) {
    return this.playlists.removeTrack(id, trackId, user.sub);
  }
}
