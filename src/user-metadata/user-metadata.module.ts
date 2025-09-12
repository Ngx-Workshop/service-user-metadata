import { Module } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { NgxAuthClientModule, RemoteAuthGuard } from '@tmdjr/ngx-auth-client';
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
        ]),
      ];
// When generating OpenAPI, stub out the Mongoose model and the guard
const FAKE_PROVIDERS =
  process.env.GENERATE_OPENAPI === 'true'
    ? [
        {
          provide: getModelToken(UserMetadata.name),
          // Minimal fake the service can accept; if service calls methods during generation (it shouldn't), add no-op fns
          useValue: {
            // common Mongoose methods we might accidentally touch
            find: () => ({ exec: async () => [] }),
            findById: () => ({ exec: async () => null }),
            findByIdAndUpdate: () => ({ exec: async () => null }),
            findOne: () => ({ exec: async () => null }),
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
  imports: [NgxAuthClientModule, ...SCHEMA_IMPORTS],
  controllers: [UserMetadataController],
  providers: [UserMetadataService, ...FAKE_PROVIDERS],
})
export class UserMetadataModule {}
