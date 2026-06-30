import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class RegisterServiceDto {
  @ApiProperty({ example: 'user-service' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'http://user-service:3001' })
  @IsString()
  internalUrl!: string;

  @ApiProperty({ type: [String], example: ['/auth', '/users'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  routes!: string[];

  @ApiProperty({ example: 'http://user-service:3001/health' })
  @IsString()
  healthUrl!: string;
}

export interface RegistryEntry {
  name: string;
  internalUrl: string;
  routes: string[];
  healthUrl: string;
  status: 'UP' | 'DOWN';
  registeredAt: string;
}
