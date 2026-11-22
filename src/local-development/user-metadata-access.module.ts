import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  NgxAuthClientModule,
  RemoteAuthGuard,
  RolesGuard,
} from '@tmdjr/ngx-auth-client';
import { UserMetadataAuthGuard } from './user-metadata-auth.guard';

@Module({
  imports: [NgxAuthClientModule],
  providers: [
    { provide: APP_GUARD, useClass: UserMetadataAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    ...(process.env.GENERATE_OPENAPI === 'true'
      ? [{ provide: RemoteAuthGuard, useValue: { canActivate: () => true } }]
      : []),
  ],
})
export class UserMetadataAccessModule {}
