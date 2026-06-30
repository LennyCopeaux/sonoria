import { IsIn } from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['SUBSCRIBER'])
  plan!: 'SUBSCRIBER';
}
