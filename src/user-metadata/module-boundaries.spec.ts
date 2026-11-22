import type { Server } from 'node:http';
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getModelToken } from '@nestjs/mongoose';
import { AuthenticationGuard, Role } from '@tmdjr/ngx-auth-client';
import { of } from 'rxjs';
import { UserMetadata } from './schemas/user-metadata.schema';
import { configureObservability } from '../observability/observability';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Callable Supertest in CommonJS.
import request = require('supertest');

describe('Composition-root access and validation', () => {
  let app: INestApplication<Server>;
  const original = { ...process.env };
  const email = 'fixture@example.invalid';
  const post = jest.fn(() =>
    of({ data: { uuid: 'fixture-id', email, role: Role.Regular } })
  );

  beforeAll(async () => {
    process.env.GENERATE_OPENAPI = 'true';
    delete process.env.USER_METADATA_LOCAL_DEV;
    const { AppModule } = await import('../app.module');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const incoming = context.switchToHttp().getRequest<{
            headers: { authorization?: string };
            user?: { sub: string; role: Role };
          }>();
          if (!incoming.headers.authorization)
            throw new UnauthorizedException();
          incoming.user = {
            sub: 'test-learner',
            role:
              incoming.headers.authorization === 'Bearer admin'
                ? Role.Admin
                : Role.Regular,
          };
          return true;
        },
      })
      .overrideProvider(HttpService)
      .useValue({ post })
      .overrideProvider(getModelToken(UserMetadata.name))
      .useValue({
        findOneAndUpdate: () => ({
          exec: () => Promise.resolve({ uuid: 'fixture-id', email }),
        }),
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureObservability(app);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    process.env = original;
  });

  it('keeps heartbeat anonymous and all three domain routes protected', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    for (const route of [
      '/user-metadata',
      '/user-metadata/coding-lab-attempts',
      '/user-metadata/workshop-progress',
    ]) {
      await request(app.getHttpServer()).get(route).expect(401);
    }
  });
  it('preserves the global administrator role guard', async () => {
    await request(app.getHttpServer())
      .post('/user-metadata/admin/users')
      .set('Authorization', 'Bearer learner')
      .send({})
      .expect(403);
  });
  it('preserves DTO and attempt-ID validation before touching model stubs', async () => {
    await request(app.getHttpServer())
      .post('/user-metadata/admin/users')
      .set('Authorization', 'Bearer admin')
      .send({
        email: 'invalid',
        password: 'short',
        role: 'unknown',
        requestId: 'bad',
        extra: true,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/user-metadata/coding-lab-attempts')
      .set('Authorization', 'Bearer learner')
      .send({ labId: 'bad', requestId: 'bad', result: {} })
      .expect(400);
    await request(app.getHttpServer())
      .get('/user-metadata/coding-lab-attempts/bad')
      .set('Authorization', 'Bearer learner')
      .expect(400);
  });
  it('correlates a real guarded HTTP account use case with its owner request', async () => {
    const response = await request(app.getHttpServer())
      .post('/user-metadata/admin/users')
      .set('Authorization', 'Bearer admin')
      .set('X-Request-ID', 'untrusted-client-id')
      .send({
        email,
        password: 'FixturePassword12345',
        role: Role.Regular,
        requestId: '854d82a6-cea9-4812-9d47-9c43ddc5447c',
      })
      .expect(201);
    expect(response.body).toEqual({ uuid: 'fixture-id', email });
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users'),
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Request-ID': response.headers['x-request-id'],
        }) as unknown,
      })
    );
    expect(response.headers['x-request-id']).not.toBe('untrusted-client-id');
  });
});
