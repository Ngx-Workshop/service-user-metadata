import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticationGuard, Role } from '@tmdjr/ngx-auth-client';
import { RequestKeys } from '@tmdjr/ngx-auth-client/enums/request-keys.enum';
import { Request } from 'express';
import {
  assertLocalDatabase,
  localMode,
  localOrigins,
} from './local-development';

@Injectable()
export class UserMetadataAuthGuard implements CanActivate {
  constructor(private readonly authentication: AuthenticationGuard) {}

  canActivate(context: ExecutionContext) {
    if (!localMode()) return this.authentication.canActivate(context);
    assertLocalDatabase();
    const request = context.switchToHttp().getRequest<Request>();
    if (
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(
        request.socket.remoteAddress ?? ''
      ) ||
      (request.headers.origin !== undefined &&
        !localOrigins.includes(request.headers.origin))
    ) {
      throw new ForbiddenException(
        'Local development access requires loopback and an allowed origin'
      );
    }
    const localRequest = request as Request & {
      [RequestKeys.REQUEST_USER_KEY]: {
        sub: string;
        role: Role;
        email: string;
      };
    };
    localRequest[RequestKeys.REQUEST_USER_KEY] = {
      sub: 'local-user-metadata-admin',
      role: Role.Admin,
      email: 'local-admin@example.invalid',
    };
    return true;
  }
}
