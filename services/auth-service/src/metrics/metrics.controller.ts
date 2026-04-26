import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from '@quorvexa/observability';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  private readonly metricsService = new MetricsService('auth-service');

  @Get()
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
