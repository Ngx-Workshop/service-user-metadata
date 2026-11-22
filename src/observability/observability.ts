import {
  ConsoleLogger,
  HttpException,
  INestApplication,
  Logger,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

const context = new AsyncLocalStorage<{
  requestId?: string;
  operationId?: string;
}>();

type DomainEvent =
  | 'account_provision'
  | 'metadata_upsert'
  | 'metadata_update'
  | 'metadata_remove'
  | 'metadata_role_update'
  | 'lab_attempt_start'
  | 'lab_attempt_save'
  | 'lab_attempt_submit'
  | 'workshop_catalog'
  | 'workshop_start'
  | 'workshop_complete'
  | 'workshop_page'
  | 'workshop_page_seen';

export function correlationHeaders(): Record<string, string> {
  const current = context.getStore();
  const id = current?.requestId ?? current?.operationId;
  return id ? { 'X-Request-ID': id } : {};
}

export async function observeOperation<T>(
  logger: Pick<Logger, 'log' | 'warn' | 'error'>,
  event: DomainEvent,
  action: () => Promise<T>
): Promise<T> {
  const parent = context.getStore();
  // Nested use cases contribute to the outer outcome, not duplicate domain events.
  if (parent?.operationId) return action();
  const operationId = randomUUID();
  const started = process.hrtime.bigint();
  return context.run({ ...parent, operationId }, async () => {
    const entry = () => ({
      event,
      operationId,
      ...(parent?.requestId ? { requestId: parent.requestId } : {}),
      durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
    });
    try {
      const result = await action();
      logger.log({ ...entry(), outcome: 'success' });
      return result;
    } catch (error: unknown) {
      const statusCode =
        error instanceof HttpException ? error.getStatus() : 500;
      const failure = { ...entry(), outcome: 'failure', statusCode };
      if (statusCode < 500) logger.warn(failure);
      else logger.error(failure);
      throw error;
    }
  });
}

export function createServiceLogger(): ConsoleLogger {
  return new ConsoleLogger({
    json: true,
    colors: false,
    logLevels: ['log', 'warn', 'error', 'fatal'],
  });
}

export function httpLoggingMiddleware(
  logger: Pick<Logger, 'log' | 'warn' | 'error'> = new Logger('HTTP')
) {
  return (request: Request, response: Response, next: NextFunction): void => {
    // Heartbeats are represented by probe metrics, not repetitive access logs.
    if (
      request.path === '/health' &&
      ['GET', 'HEAD'].includes(request.method)
    ) {
      next();
      return;
    }
    const requestId = randomUUID();
    const started = process.hrtime.bigint();
    response.setHeader('X-Request-ID', requestId);
    response.once('finish', () => {
      const route = request.route as { path?: unknown } | undefined;
      const entry = {
        event: 'http_request',
        requestId,
        method: request.method,
        // Never export concrete paths, queries, bodies, cookies or auth headers.
        route: typeof route?.path === 'string' ? route.path : '/unmatched',
        statusCode: response.statusCode,
        durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
      };
      if (entry.statusCode >= 500) logger.error(entry);
      else if (entry.statusCode >= 400) logger.warn(entry);
      else logger.log(entry);
    });
    // Caller-supplied IDs are deliberately ignored; only locally generated IDs propagate.
    context.run({ requestId }, next);
  };
}

export function configureObservability(app: INestApplication): void {
  app.use(httpLoggingMiddleware());
  app.enableShutdownHooks();
}
