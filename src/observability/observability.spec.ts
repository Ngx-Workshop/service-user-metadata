import type { Server } from 'node:http';
import {
  Controller,
  Get,
  INestApplication,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Match callable Supertest in CommonJS service builds.
import request = require('supertest');
import { ObservabilityModule } from './observability.module';
import {
  correlationHeaders,
  createServiceLogger,
  httpLoggingMiddleware,
  observeOperation,
} from './observability';

const domain = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

@Controller('items')
class TestController {
  @Get(':id')
  get() {
    return { ok: true };
  }
  @Get(':id/operation')
  operation() {
    return observeOperation(domain, 'metadata_update', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return observeOperation(domain, 'metadata_upsert', async () => {
        await Promise.resolve();
        return { upstreamRequestId: correlationHeaders()['X-Request-ID'] };
      });
    });
  }
  @Get(':id/failure')
  failure() {
    return observeOperation(domain, 'metadata_update', () => {
      return Promise.reject(
        new ServiceUnavailableException('private-upstream-body')
      );
    });
  }
}

describe('Service observability', () => {
  let app: INestApplication<Server>;
  const log = jest.fn();
  const warn = jest.fn();
  const error = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ObservabilityModule],
      controllers: [TestController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.use(httpLoggingMiddleware({ log, warn, error }));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serves an anonymous, non-cached heartbeat without database or auth providers', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      status: 'ok',
      info: { heartbeat: { status: 'up' } },
      error: {},
      details: { heartbeat: { status: 'up' } },
    });
    expect(log).not.toHaveBeenCalled();
    expect(domain.log).not.toHaveBeenCalled();
    await request(app.getHttpServer()).head('/health').expect(200);
    expect(log).not.toHaveBeenCalled();
  });

  it('logs route templates and timings without request data or concrete identifiers', async () => {
    const response = await request(app.getHttpServer())
      .get('/items/private-person?token=private-query')
      .set('Authorization', 'Bearer private-auth')
      .set('Cookie', 'session=private-cookie')
      .expect(200);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_request',
        method: 'GET',
        route: '/items/:id',
        statusCode: 200,
        durationMs: expect.any(Number) as unknown,
        requestId: response.headers['x-request-id'],
      })
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
  });

  it('logs unknown routes without their raw paths or query values', async () => {
    await request(app.getHttpServer())
      .get('/private-missing?secret=private-query')
      .expect(404);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/unmatched', statusCode: 404 })
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-');
  });

  it('does not provide a write endpoint for heartbeat', async () => {
    await request(app.getHttpServer())
      .post('/health')
      .send({ secret: 'private-body' })
      .expect(404);
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-body');
  });

  it('uses native Nest JSON logging with a contextual, structured message', () => {
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    try {
      createServiceLogger().log({ event: 'test_event' }, 'ObservabilityTest');
      expect(write).toHaveBeenCalled();
      const entry: unknown = JSON.parse(String(write.mock.calls[0][0]));
      expect(entry).toEqual(
        expect.objectContaining({
          level: 'log',
          context: 'ObservabilityTest',
          message: { event: 'test_event' },
        })
      );
    } finally {
      write.mockRestore();
    }
  });
  it('isolates concurrent operations, ignores caller IDs and propagates only generated IDs', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer())
        .get('/items/private-a/operation')
        .set('X-Request-ID', 'private-injected-id'),
      request(app.getHttpServer())
        .get('/items/private-b/operation')
        .set('X-Request-ID', 'a'.repeat(500)),
    ]);
    const ids = responses.map((response) => response.headers['x-request-id']);
    expect(new Set(ids).size).toBe(2);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        upstreamRequestId: response.headers['x-request-id'],
      });
      expect(domain.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'metadata_update',
          outcome: 'success',
          requestId: response.headers['x-request-id'],
          operationId: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
          durationMs: expect.any(Number) as unknown,
        })
      );
    }
    expect(domain.log).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(domain.log.mock.calls)).not.toContain('private-');
    expect(correlationHeaders()).toEqual({});
  });
  it('keeps HTTP errors and one safe domain failure without raw exception content', async () => {
    const response = await request(app.getHttpServer())
      .get('/items/private-person/failure')
      .set('Authorization', 'Bearer private-secret')
      .expect(503);
    expect(domain.error).toHaveBeenCalledTimes(1);
    expect(domain.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'metadata_update',
        outcome: 'failure',
        statusCode: 503,
        requestId: response.headers['x-request-id'],
      })
    );
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'http_request', statusCode: 503 })
    );
    expect(
      JSON.stringify(domain.error.mock.calls) + JSON.stringify(error.mock.calls)
    ).not.toContain('private-');
  });
});
