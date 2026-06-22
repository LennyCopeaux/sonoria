import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, Subscription } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

const SUBSCRIPTION_DURATION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(
    userId: string,
    dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    const expiresAt = new Date(
      Date.now() + SUBSCRIPTION_DURATION_DAYS * MS_PER_DAY,
    );

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: dto.plan,
          status: 'ACTIVE',
          expiresAt,
        },
        update: {
          plan: dto.plan,
          status: 'ACTIVE',
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: Role.SUBSCRIBER },
      }),
    ]);

    return subscription;
  }

  async cancel(userId: string): Promise<Subscription> {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('No subscription found');
    }

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { userId },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: Role.USER },
      }),
    ]);

    return subscription;
  }

  async getForUser(userId: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    return subscription;
  }
}
