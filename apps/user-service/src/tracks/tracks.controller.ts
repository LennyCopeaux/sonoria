import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalUser } from '../auth/decorators/optional-user.decorator';
import { JwtPayload } from '../auth/types';
import { InternalGuard } from '../common/guards/internal.guard';
import { TracksService } from './tracks.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { InternalUpdateTrackDto } from './dto/internal-update-track.dto';
import { ListTracksQueryDto } from './dto/list-tracks-query.dto';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ARTIST)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTrackDto,
  ) {
    return this.tracksService.create(user, dto);
  }

  @Get()
  findAll(
    @Query() query: ListTracksQueryDto,
    @OptionalUser() user: JwtPayload | undefined,
  ) {
    return this.tracksService.findAll(query, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @OptionalUser() user: JwtPayload | undefined,
  ) {
    return this.tracksService.findOne(id, user);
  }

  @Patch(':id/internal')
  @UseGuards(InternalGuard)
  internalUpdate(
    @Param('id') id: string,
    @Body() dto: InternalUpdateTrackDto,
  ) {
    return this.tracksService.internalUpdate(id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ARTIST)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTrackDto,
  ) {
    return this.tracksService.update(id, user, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ARTIST, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tracksService.remove(id, user);
  }

  @Post(':id/play')
  @UseGuards(AuthGuard)
  play(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tracksService.play(id, user);
  }
}
