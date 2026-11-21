import type { Server } from 'node:http';
import { UserMetadataAuthGuard } from '../local-development/user-metadata-auth.guard';
import {
  Controller,
  Get,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Match callable Supertest in CommonJS service builds.
import request = require('supertest');
import { ObservabilityModule } from './observability.module';

@Controller('protected-observability-test')
class ProtectedController {
  @Get() get() {
    return { secret: true };
  }
}

describe('Heartbeat authorization boundary', () => {
  let app: INestApplication<Server>;
  const denied = jest.fn(() => {
    throw new UnauthorizedException();
  });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ObservabilityModule],
      controllers: [ProtectedController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalGuards(
      new UserMetadataAuthGuard({
        canActivate: denied,
      } as unknown as ConstructorParameters<typeof UserMetadataAuthGuard>[0])
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('allows heartbeat but still enforces authentication for business routes', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    expect(denied).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get('/protected-observability-test')
      .expect(401);
    expect(denied).toHaveBeenCalledTimes(1);
  });
});
