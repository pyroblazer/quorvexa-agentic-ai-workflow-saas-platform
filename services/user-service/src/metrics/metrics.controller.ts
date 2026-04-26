import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from '@quorvexa/observability';
import { Response } from 'express';

let metricsService: MetricsService;

function getMetricsService(): MetricsService {
  if (!metricsService) {
    metricsService = new MetricsService('user-service');
  }
  return metricsService;
}

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async getMetrics(@Res() res: Response) {
    const service = getMetricsService();
    res.set('Content-Type', service.getContentType());
    res.end(await service.getMetrics());
  }
}
