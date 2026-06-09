import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
