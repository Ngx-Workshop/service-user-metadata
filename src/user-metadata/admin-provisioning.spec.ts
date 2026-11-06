import { UserMetadataService } from './user-metadata.service';
import { UserMetadataController } from './user-metadata.controller';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { Role } from '@tmdjr/ngx-auth-client';
import { of, throwError } from 'rxjs';
import { validate } from 'class-validator';
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
    service = new UserMetadataService(model as any, http as any);
  });
  afterEach(() => {
    process.env = { ...original };
  });
  it('uses auth identity for profile upsert and forwards no profile fields or new session cookie', async () => {
    expect(
      (
        await service.createAccount(dto, {
          headers: { cookie: 'accessToken=admin-session' },
        } as any)
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
        headers: { Cookie: 'accessToken=admin-session' },
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
      service.createAccount(dto, { headers: {} } as any)
    ).rejects.toThrow('Account created, but its profile');
    expect(
      (await service.createAccount(dto, { headers: {} } as any)).uuid
    ).toBe('account-id');
    expect(http.post.mock.calls[0][1].requestId).toBe(
      http.post.mock.calls[1][1].requestId
    );
  });
  it('never calls hosted auth from isolated local metadata mode', async () => {
    process.env.USER_METADATA_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/user_metadata_local';
    await service.createAccount(dto, {
      headers: { cookie: 'must-not-leave-local' },
    } as any);
    expect(http.post.mock.calls[0][0]).toBe(
      'http://127.0.0.1:3005/admin/users'
    );
    expect(http.post.mock.calls[0][2].headers).toEqual({});
  });
  it('propagates duplicate/unavailable errors without writing metadata', async () => {
    http.post.mockReturnValue(
      throwError(() => ({ response: { status: 409 } }))
    );
    await expect(
      service.createAccount(dto, { headers: {} } as any)
    ).rejects.toThrow('already exists');
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    http.post.mockReturnValue(throwError(() => new Error('offline')));
    await expect(
      service.createAccount(dto, { headers: {} } as any)
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
      Reflect.getMetadata('roles', UserMetadataController.prototype.createUser)
    ).toEqual([Role.Admin]);
  });
});
