import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { createLogger } from '@quorvexa/observability';
import type { Response } from 'express';

const logger = createLogger('workflow-service:exception-filter');

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const excResponse = exception.getResponse();
      message =
        typeof excResponse === 'string'
          ? excResponse
          : (excResponse as Record<string, unknown>).message as string ?? exception.message;
    } else if (exception instanceof Error) {
      logger.error({ err: exception, stack: exception.stack }, 'Unhandled exception');
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
