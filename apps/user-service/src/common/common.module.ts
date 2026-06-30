import { Module } from '@nestjs/common';
import { InternalGuard } from './guards/internal.guard';

@Module({
  providers: [InternalGuard],
  exports: [InternalGuard],
})
export class CommonModule {}
