import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma.service';
import { HealthResponseDto } from './dto/health.response';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Unauthenticated on purpose: a container orchestrator has no session, and
   * the answer discloses only whether the database is reachable.
   */
  @ApiOperation({
    summary: 'Liveness and database reachability',
    description:
      'Public by design. Consumed by the compose healthcheck and by Fly.io, neither of which holds a session.',
  })
  @ApiOkResponse({
    description: 'The service is up. `database` reports a `SELECT 1`, not a 500.',
    type: HealthResponseDto,
  })
  @Get()
  async check(): Promise<HealthResponseDto> {
    let database = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }
    return { status: 'ok', database };
  }
}
