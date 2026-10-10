import {
  WorkshopProgress,
  WorkshopProgressSchema,
} from '../workshop-progress/workshop-progress.schema';
import { WorkshopProgressService } from '../workshop-progress/workshop-progress.service';
import { WorkshopProgressController } from '../workshop-progress/workshop-progress.controller';
import { UserMetadataAuthGuard } from '../local-development/user-metadata-auth.guard';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import {
  NgxAuthClientModule,
  RemoteAuthGuard,
  RolesGuard,
} from '@tmdjr/ngx-auth-client';
import {
  UserMetadata,
  UserMetadataSchema,
} from './schemas/user-metadata.schema';
import { UserMetadataController } from './user-metadata.controller';
import { UserMetadataService } from './user-metadata.service';

const SCHEMA_IMPORTS =
  process.env.GENERATE_OPENAPI === 'true'
    ? []
    : [
        MongooseModule.forFeature([
          { name: UserMetadata.name, schema: UserMetadataSchema },
          { name: WorkshopProgress.name, schema: WorkshopProgressSchema },
        ]),
      ];
// When generating OpenAPI, stub out the Mongoose model and the guard
const FAKE_PROVIDERS =
  process.env.GENERATE_OPENAPI === 'true'
    ? [
        { provide: getModelToken(WorkshopProgress.name), useValue: {} },
        {
          provide: getModelToken(UserMetadata.name),
          // Minimal fake the service can accept; if service calls methods during generation (it shouldn't), add no-op fns
          useValue: {
            // common Mongoose methods we might accidentally touch
            find: () => ({ exec: () => Promise.resolve([]) }),
            findById: () => ({ exec: () => Promise.resolve(null) }),
            findByIdAndUpdate: () => ({ exec: () => Promise.resolve(null) }),
            findOne: () => ({ exec: () => Promise.resolve(null) }),
          },
        },
        {
          // In case the guard has runtime deps — make it a no-op
          provide: RemoteAuthGuard,
          useValue: { canActivate: () => true },
        },
      ]
    : [];
@Module({
  imports: [HttpModule, NgxAuthClientModule, ...SCHEMA_IMPORTS],
  controllers: [UserMetadataController, WorkshopProgressController],
  providers: [
    UserMetadataService,
    WorkshopProgressService,
    {
      provide: APP_GUARD,
      useClass: UserMetadataAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    ...FAKE_PROVIDERS,
  ],
})
export class UserMetadataModule {}
