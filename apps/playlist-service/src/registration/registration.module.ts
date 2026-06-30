import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';

@Module({
  providers: [RegistrationService],
})
export class RegistrationModule {}
