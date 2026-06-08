import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { RegisterServiceDto } from './dto/register-service.dto';
import { RegistryService } from './registry.service';

@ApiTags('registry')
@Controller('registry')
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterServiceDto) {
    return this.registry.register(dto);
  }

  @Public()
  @Put('heartbeat/:name')
  heartbeat(@Param('name') name: string) {
    return this.registry.heartbeat(name);
  }
}
