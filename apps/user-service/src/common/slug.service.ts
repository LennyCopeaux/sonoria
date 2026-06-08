import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '@sonoria/utils';

@Injectable()
export class SlugService {
  constructor(private readonly prisma: PrismaService) {}

  async uniquePlaylistSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title) || 'playlist';
    let slug = base;
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.playlist.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) {
        return slug;
      }
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
  }
}
