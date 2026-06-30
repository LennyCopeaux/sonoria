import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  artist: { slug: string; bio: string | null } | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { artistProfile: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      artist: user.artistProfile
        ? { slug: user.artistProfile.slug, bio: user.artistProfile.bio }
        : null,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const userData: { name?: string; avatarUrl?: string } = {};
    if (dto.name !== undefined) userData.name = dto.name;
    if (dto.avatarUrl !== undefined) userData.avatarUrl = dto.avatarUrl;

    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: userData });
    }

    if (dto.bio !== undefined) {
      await this.prisma.artistProfile.updateMany({
        where: { userId },
        data: { bio: dto.bio },
      });
    }

    return this.getProfile(userId);
  }
}
