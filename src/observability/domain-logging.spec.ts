import { HttpService } from '@nestjs/axios';
import { ForbiddenException, Logger } from '@nestjs/common';
import { Role } from '@tmdjr/ngx-auth-client';
import { Request } from 'express';
import { Model } from 'mongoose';
import { of, throwError } from 'rxjs';
import { UserMetadataService } from '../user-metadata/user-metadata.service';
import { UserMetadataDocument } from '../user-metadata/schemas/user-metadata.schema';
import { createServiceLogger, observeOperation } from './observability';

describe('Native domain outcome JSON', () => {
  const original = { ...process.env };
  let stdout: jest.SpyInstance<
    boolean,
    Parameters<typeof process.stdout.write>
  >;
  let stderr: jest.SpyInstance<
    boolean,
    Parameters<typeof process.stderr.write>
  >;
  const post = jest.fn();
  const put = jest.fn();
  const exec = jest.fn();
  let service: UserMetadataService;
  const dto = {
    email: 'canary-profile@example.invalid',
    password: 'canary-credential',
    firstName: 'canary-content',
    role: Role.Regular,
    requestId: 'canary-client-id',
  };
  const incoming = { headers: { cookie: 'canary-cookie' } } as Request;

  beforeEach(() => {
    delete process.env.USER_METADATA_LOCAL_DEV;
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    Logger.overrideLogger(createServiceLogger());
    post.mockReturnValue(
      of({
        data: { uuid: 'canary-identity', email: dto.email, role: dto.role },
      })
    );
    exec.mockResolvedValue({ uuid: 'canary-identity' });
    service = new UserMetadataService(
      {
        findOneAndUpdate: () => ({ exec }),
      } as unknown as Model<UserMetadataDocument>,
      { post, put } as unknown as HttpService
    );
  });
  afterEach(() => {
    Logger.overrideLogger(false);
    stdout.mockRestore();
    stderr.mockRestore();
    jest.clearAllMocks();
    process.env = { ...original };
  });

  function entries(): unknown[] {
    const serialized = [...stdout.mock.calls, ...stderr.mock.calls]
      .map((call) => String(call[0]))
      .join('');
    expect(serialized).not.toContain('canary-');
    return serialized
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown);
  }

  it('logs the real account/profile outcome without credentials, profile or client IDs', async () => {
    await service.createAccount(dto, incoming);
    expect(entries()).toEqual([
      expect.objectContaining({
        level: 'log',
        context: 'UserMetadataService',
        message: {
          event: 'account_provision',
          outcome: 'success',
          operationId: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
          durationMs: expect.any(Number) as unknown,
        },
      }),
    ]);
  });
  it.each(['upstream', 'storage'])(
    'logs a %s failure exactly once, without a raw stack or payload',
    async (boundary) => {
      const failure = new Error('canary-upstream-secret');
      if (boundary === 'upstream')
        post.mockReturnValue(throwError(() => failure));
      else exec.mockRejectedValue(failure);
      await expect(service.createAccount(dto, incoming)).rejects.toThrow();
      expect(entries()).toEqual([
        expect.objectContaining({
          level: 'error',
          context: 'UserMetadataService',
          message: expect.objectContaining({
            event: 'account_provision',
            outcome: 'failure',
            statusCode: 503,
          }) as unknown,
        }),
      ]);
    }
  );
  it('uses warning level for denied actions and preserves the original exception', async () => {
    const denied = new ForbiddenException('canary-private-denial');
    await expect(
      observeOperation(new Logger('DomainTest'), 'workshop_start', () =>
        Promise.reject(denied)
      )
    ).rejects.toBe(denied);
    expect(entries()).toEqual([
      expect.objectContaining({
        level: 'warn',
        context: 'DomainTest',
        message: expect.objectContaining({
          event: 'workshop_start',
          outcome: 'failure',
          statusCode: 403,
        }) as unknown,
      }),
    ]);
  });
  it('does not export role-sync credential or upstream stack canaries', async () => {
    put.mockReturnValue(
      throwError(() => new Error('canary-role-upstream-stack'))
    );
    await expect(
      service.updateRole(
        'canary-user-id',
        'admin',
        Object.assign({}, incoming, {
          cookies: { accessToken: 'canary-access-token' },
        })
      )
    ).rejects.toThrow('Updateing user role failed');
    expect(entries()).toEqual([
      expect.objectContaining({
        level: 'error',
        context: 'UserMetadataService',
        message: expect.objectContaining({
          event: 'metadata_role_update',
          outcome: 'failure',
          statusCode: 500,
        }) as unknown,
      }),
    ]);
  });
});
