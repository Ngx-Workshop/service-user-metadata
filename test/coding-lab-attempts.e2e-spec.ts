import { Test } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { getConnectionToken } from '@nestjs/mongoose';
import { AuthenticationGuard } from '@tmdjr/ngx-auth-client';
import { Connection } from 'mongoose';
import { of, throwError } from 'rxjs';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';

describe('Coding attempts HTTP persistence (disposable local Mongo)', () => {
  let app: INestApplication;
  let connection: Connection;
  const dbName = 'user_metadata_test_labs_' + randomUUID().replace(/-/g, '');
  const labId = '111111111111111111111111';
  const versionId = '222222222222222222222222';
  const http = {
    get: jest.fn(() =>
      of({
        data: {
          versionId,
          versionNumber: 1,
          title: 'Sum array',
          starterCode: 'starter',
        },
      })
    ),
    post: jest.fn(() =>
      of({
        data: {
          passed: true,
          totalTests: 2,
          passedTests: 2,
          durationMs: 20,
          results: [{ name: 'sample', status: 'passed' }],
        },
      })
    ),
  };
  beforeAll(async () => {
    delete process.env.USER_METADATA_LOCAL_DEV;
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/' + dbName;
    process.env.CODING_LABS_BASE_URL = 'http://coding-labs.invalid';
    const { AppModule } = await import('../src/app.module');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = {
            sub: req.headers.authorization.slice(7),
            role: 'regular',
          };
          return true;
        },
      })
      .overrideProvider(HttpService)
      .useValue(http)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
    );
    await app.init();
    connection = app.get(getConnectionToken());
    await connection
      .collection('coding_lab_attempts')
      .createIndex({ uuid: 1, requestId: 1 }, { unique: true });
    await connection
      .collection('coding_lab_attempts')
      .createIndex(
        { uuid: 1, labId: 1 },
        { unique: true, partialFilterExpression: { status: 'in-progress' } }
      );
  });
  afterAll(async () => {
    if (connection?.name === dbName) await connection.dropDatabase();
    await app?.close();
    delete process.env.CODING_LABS_BASE_URL;
  });
  const api = () => request(app.getHttpServer());
  const prefix = '/user-metadata/coding-lab-attempts';
  let attempt: { _id: string; code: string; revision: number };
  let oldId: string;
  it('requires auth and validates requests/identifiers', async () => {
    await api().get(prefix).expect(401);
    await api()
      .post(prefix)
      .set('Authorization', 'Bearer learner')
      .send({ labId: 'bad', requestId: 'bad' })
      .expect(400);
    await api()
      .get(prefix + '/bad')
      .set('Authorization', 'Bearer learner')
      .expect(400);
  });
  it('starts idempotently and concurrent starts resume one active attempt', async () => {
    const body = { labId, requestId: randomUUID() };
    const started = await api()
      .post(prefix)
      .set('Authorization', 'Bearer learner')
      .send(body)
      .expect(200);
    attempt = started.body;
    oldId = attempt._id;
    expect(
      (
        await api()
          .post(prefix)
          .set('Authorization', 'Bearer learner')
          .send(body)
          .expect(200)
      ).body._id
    ).toBe(attempt._id);
    const starts = await Promise.all(
      Array.from({ length: 3 }, () =>
        api()
          .post(prefix)
          .set('Authorization', 'Bearer learner')
          .send({ labId, requestId: randomUUID() })
          .expect(200)
      )
    );
    expect(starts.every((result) => result.body._id === attempt._id)).toBe(
      true
    );
  });
  it('enforces owner isolation, rejects forged scores and conflicts on stale saves', async () => {
    await api()
      .get(prefix + '/' + attempt._id)
      .set('Authorization', 'Bearer stranger')
      .expect(404);
    await api()
      .patch(prefix + '/' + attempt._id)
      .set('Authorization', 'Bearer stranger')
      .send({ code: 'solution', revision: 0 })
      .expect(404);
    await api()
      .patch(prefix + '/' + attempt._id)
      .set('Authorization', 'Bearer learner')
      .send({ code: 'solution', revision: 0, result: { passed: true } })
      .expect(400);
    attempt = (
      await api()
        .patch(prefix + '/' + attempt._id)
        .set('Authorization', 'Bearer learner')
        .send({ code: 'solution', revision: 0 })
        .expect(200)
    ).body;
    await api()
      .patch(prefix + '/' + attempt._id)
      .set('Authorization', 'Bearer learner')
      .send({ code: 'stale', revision: 0 })
      .expect(409);
    expect(
      (
        await api()
          .get(prefix + '/' + attempt._id)
          .set('Authorization', 'Bearer learner')
          .expect(200)
      ).body.code
    ).toBe('solution');
  });
  it('stores server grades once and preserves results on retry', async () => {
    const body = { code: attempt.code, revision: attempt.revision };
    const result = await api()
      .post(prefix + '/' + attempt._id + '/submit')
      .set('Authorization', 'Bearer learner')
      .send(body)
      .expect(200);
    expect(result.body.result.passed).toBe(true);
    expect(result.body).not.toHaveProperty('uuid');
    expect(result.body).not.toHaveProperty('leaseToken');
    const count = http.post.mock.calls.length;
    await api()
      .post(prefix + '/' + attempt._id + '/submit')
      .set('Authorization', 'Bearer learner')
      .send(body)
      .expect(200);
    expect(http.post.mock.calls.length).toBe(count);
    attempt = (
      await api()
        .post(prefix)
        .set('Authorization', 'Bearer learner')
        .send({ labId, requestId: randomUUID() })
        .expect(200)
    ).body;
    expect(attempt._id).not.toBe(oldId);
    expect(attempt.code).toBe('starter');
    const history = await api()
      .get(prefix)
      .set('Authorization', 'Bearer learner')
      .expect(200);
    expect(history.body.length).toBe(2);
    expect(
      history.body.find((record) => record._id === oldId).result.passed
    ).toBe(true);
  });
  it('preserves submitted code, advances revision and releases a failed execution lease', async () => {
    http.post.mockReturnValueOnce(throwError(() => new Error('Offline')));
    await api()
      .post(prefix + '/' + attempt._id + '/submit')
      .set('Authorization', 'Bearer learner')
      .send({ code: 'retained', revision: 0 })
      .expect(503);
    const saved = (
      await api()
        .get(prefix + '/' + attempt._id)
        .set('Authorization', 'Bearer learner')
        .expect(200)
    ).body;
    expect(saved.status).toBe('in-progress');
    expect(saved.code).toBe('retained');
    expect(saved.revision).toBe(1);
    await api()
      .patch(prefix + '/' + attempt._id)
      .set('Authorization', 'Bearer learner')
      .send({ code: 'revised', revision: 1 })
      .expect(200);
  });
});
