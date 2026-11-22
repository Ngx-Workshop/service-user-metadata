import { UserMetadataService } from './user-metadata.service';
import { UserMetadataController } from './user-metadata.controller';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { Role } from '@tmdjr/ngx-auth-client';
import { of, throwError } from 'rxjs';
import { validate } from 'class-validator';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { Request } from 'express';
import { UserMetadataDocument } from './schemas/user-metadata.schema';
const dto: AdminCreateUserDto = {
  email: 'user@example.invalid',
  password: 'Examplepass12345',
  role: Role.Regular,
  requestId: 'bd769501-b715-4569-9206-381deee177ef',
  firstName: 'Created',
};
describe('Account and profile provisioning', () => {
  const original = { ...process.env };
  let service: UserMetadataService;
  const exec = jest.fn();
  const model = { findOneAndUpdate: jest.fn() };
  const http = { post: jest.fn() };
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.USER_METADATA_LOCAL_DEV;
    model.findOneAndUpdate.mockReturnValue({ exec });
    exec.mockResolvedValue({ uuid: 'account-id', email: dto.email });
    http.post.mockReturnValue(
      of({ data: { uuid: 'account-id', email: dto.email, role: dto.role } })
    );
    service = new UserMetadataService(
      model as unknown as Model<UserMetadataDocument>,
      http as unknown as HttpService
    );
  });
  afterEach(() => {
    process.env = { ...original };
  });
  it('uses auth identity for profile upsert and forwards no profile fields or new session cookie', async () => {
    expect(
      (
        await service.createAccount(dto, {
          headers: { cookie: 'accessToken=admin-session' },
        } as Request)
      ).uuid
    ).toBe('account-id');
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users'),
      {
        email: dto.email,
        password: dto.password,
        role: dto.role,
        requestId: dto.requestId,
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: 'accessToken=admin-session',
          'X-Request-ID': expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
        }) as unknown,
      })
    );
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { uuid: 'account-id' },
      expect.objectContaining({ $setOnInsert: { uuid: 'account-id' } }),
      expect.objectContaining({ upsert: true, new: true })
    );
  });
  it('reports a recoverable partial failure and completes the same account on retry', async () => {
    exec.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      service.createAccount(dto, { headers: {} } as Request)
    ).rejects.toThrow('Account created, but its profile');
    expect(
      (await service.createAccount(dto, { headers: {} } as Request)).uuid
    ).toBe('account-id');
    for (const call of [1, 2]) {
      expect(http.post).toHaveBeenNthCalledWith(
        call,
        expect.any(String),
        expect.objectContaining({ requestId: dto.requestId }),
        expect.anything()
      );
    }
  });
  it('never calls hosted auth from isolated local metadata mode', async () => {
    process.env.USER_METADATA_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/user_metadata_local';
    await service.createAccount(dto, {
      headers: { cookie: 'must-not-leave-local' },
    } as Request);
    expect(http.post).toHaveBeenCalledWith(
      'http://127.0.0.1:3005/admin/users',
      expect.anything(),
      expect.objectContaining({
        headers: {
          'X-Request-ID': expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
        },
      })
    );
  });
  it('propagates duplicate/unavailable errors without writing metadata', async () => {
    http.post.mockReturnValue(
      throwError(() => ({ response: { status: 409 } }))
    );
    await expect(
      service.createAccount(dto, { headers: {} } as Request)
    ).rejects.toThrow('already exists');
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    http.post.mockReturnValue(throwError(() => new Error('offline')));
    await expect(
      service.createAccount(dto, { headers: {} } as Request)
    ).rejects.toThrow('unavailable');
  });
  it('requires email, credentials and role rather than inheriting optional profile validation', async () => {
    expect(
      await validate(Object.assign(new AdminCreateUserDto(), dto))
    ).toHaveLength(0);
    expect(
      (await validate(new AdminCreateUserDto())).length
    ).toBeGreaterThanOrEqual(4);
    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Reading decorator metadata, not invoking the method.
      Reflect.getMetadata('roles', UserMetadataController.prototype.createUser)
    ).toEqual([Role.Admin]);
  });
  it.each([401, 403])(
    'preserves upstream authorization denial (%s) without creating a profile',
    async (status) => {
      http.post.mockReturnValue(throwError(() => ({ response: { status } })));
      await expect(
        service.createAccount(dto, { headers: {} } as Request)
      ).rejects.toThrow('administrator authorization');
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    }
  );
  it('rejects a mismatched identity response before persistence', async () => {
    http.post.mockReturnValue(
      of({
        data: {
          uuid: 'account-id',
          email: 'different@example.invalid',
          role: dto.role,
        },
      })
    );
    await expect(
      service.createAccount(dto, { headers: {} } as Request)
    ).rejects.toThrow('invalid response');
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
