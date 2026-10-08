import { ExecutionContext } from '@nestjs/common';
import { AuthenticationGuard } from '@tmdjr/ngx-auth-client';
import {
  assertLocalDatabase,
  localDatabaseUri,
  localMode,
  localOrigins,
} from './local-development';
import { UserMetadataAuthGuard } from './user-metadata-auth.guard';

describe('user metadata local development isolation', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });
  const context = (
    origin: string | undefined = 'http://localhost:4201',
    address = '127.0.0.1'
  ) => {
    const req = {
      headers: { origin: origin as string | undefined },
      socket: { remoteAddress: address },
      user: undefined,
    };
    return {
      req,
      ctx: {
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext,
    };
  };
  const enableLocal = () => {
    process.env.USER_METADATA_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = localDatabaseUri;
  };
  const authentication = { canActivate: jest.fn().mockResolvedValue(false) };
  const guard = new UserMetadataAuthGuard(
    authentication as unknown as AuthenticationGuard
  );
  beforeEach(() => {
    authentication.canActivate.mockClear();
  });

  it.each([
    'mongodb://127.0.0.1:27017/other',
    'mongodb://remote:27017/user_metadata_local',
    undefined,
  ])('rejects a non-isolated database: %s', (uri) => {
    enableLocal();
    if (uri) process.env.MONGODB_URI = uri;
    else delete process.env.MONGODB_URI;
    expect(assertLocalDatabase).toThrow('isolated');
    expect(() => guard.canActivate(context().ctx)).toThrow('isolated');
  });
  it.each(localOrigins)(
    'allows approved local browser origin %s with synthetic admin',
    (origin) => {
      enableLocal();
      const { req, ctx } = context(origin);
      expect(guard.canActivate(ctx)).toBe(true);
      expect(req.user).toEqual({
        sub: 'local-user-metadata-admin',
        role: 'admin',
        email: 'local-admin@example.invalid',
      });
      expect(authentication.canActivate).not.toHaveBeenCalled();
    }
  );
  it.each(['::1', '::ffff:127.0.0.1'])(
    'accepts loopback address %s without a browser origin',
    (address) => {
      enableLocal();
      const { req, ctx } = context(undefined, address);
      req.headers.origin = undefined;
      expect(guard.canActivate(ctx)).toBe(true);
    }
  );
  it.each(['https://example.com', 'null', 'http://localhost:4202'])(
    'rejects origin %s',
    (origin) => {
      enableLocal();
      expect(() => guard.canActivate(context(origin).ctx)).toThrow(
        'allowed origin'
      );
    }
  );
  it('rejects remote peers even with an allowed origin', () => {
    enableLocal();
    expect(() =>
      guard.canActivate(context(localOrigins[0], '192.168.1.2').ctx)
    ).toThrow('loopback');
  });
  it('rejects startup when the local flag is set in production', () => {
    enableLocal();
    process.env.NODE_ENV = 'production';
    expect(assertLocalDatabase).toThrow('NODE_ENV=development');
  });

  it.each(['production', 'normal'])(
    'delegates to existing platform authentication in %s mode',
    async (mode) => {
      enableLocal();
      if (mode === 'production') process.env.NODE_ENV = 'production';
      else delete process.env.USER_METADATA_LOCAL_DEV;
      const { req, ctx } = context();
      expect(localMode()).toBe(false);
      await expect(guard.canActivate(ctx)).resolves.toBe(false);
      expect(authentication.canActivate).toHaveBeenCalledWith(ctx);
      expect(req.user).toBeUndefined();
    }
  );
});
