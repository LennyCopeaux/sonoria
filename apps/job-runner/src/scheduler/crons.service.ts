import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueuePublisherService } from '../queue/queue-publisher.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  isQueueEnabled,
  parseEnabledQueues,
  QUEUE_NAMES,
  type QueueName,
} from '../config/queues.config';

const STATS_LOCK_KEY = 'cron:lock:stats';
const RECO_LOCK_KEY = 'cron:lock:reco';
const STATS_LOCK_TTL = 3500;
const RECO_LOCK_TTL = 82800;

@Injectable()
export class CronsService {
  private readonly logger = new Logger(CronsService.name);
  private readonly enabledQueues: Set<QueueName>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queuePublisher: QueuePublisherService,
  ) {
    this.enabledQueues = parseEnabledQueues(process.env['QUEUES']);
  }

  @Cron('0 * * * *')
  async enqueueArtistStats(): Promise<void> {
    if (!isQueueEnabled(this.enabledQueues, QUEUE_NAMES.STATS)) return;

    const acquired = await this.redis.setNx(
      STATS_LOCK_KEY,
      '1',
      STATS_LOCK_TTL,
    );
    if (!acquired) {
      this.logger.debug('Stats cron skipped — lock already held');
      return;
    }

    const artists = await this.prisma.artistProfile.findMany({
      select: { id: true },
    });

    await Promise.all(
      artists.map((artist) =>
        this.queuePublisher.enqueueStats({ artistId: artist.id }),
      ),
    );

    this.logger.log(`Enqueued stats for ${artists.length} artists`);
  }

  @Cron('0 3 * * *')
  async enqueueUserRecommendations(): Promise<void> {
    if (!isQueueEnabled(this.enabledQueues, QUEUE_NAMES.RECO)) return;

    const acquired = await this.redis.setNx(RECO_LOCK_KEY, '1', RECO_LOCK_TTL);
    if (!acquired) {
      this.logger.debug('Reco cron skipped — lock already held');
      return;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await this.prisma.listeningHistory.findMany({
      where: { listenedAt: { gte: thirtyDaysAgo } },
      distinct: ['userId'],
      select: { userId: true },
    });

    await Promise.all(
      activeUsers.map((row) =>
        this.queuePublisher.enqueueReco({ userId: row.userId }),
      ),
    );

    this.logger.log(`Enqueued reco for ${activeUsers.length} active users`);
  }
}
