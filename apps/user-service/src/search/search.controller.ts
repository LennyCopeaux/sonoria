import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { SearchService } from './search.service';

class SearchQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q!: string;

  @IsOptional()
  @IsEnum(['track', 'artist', 'all'])
  type?: 'track' | 'artist' | 'all';

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

@Controller('search')
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  searchTracks(@Query() query: SearchQueryDto) {
    return this.search.search(
      query.q,
      query.type ?? 'track',
      query.page,
      query.limit,
    );
  }
}
