import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
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
// Model stubs are only used by the DB-disabled contract generator.
const FAKE_PROVIDERS =
  process.env.GENERATE_OPENAPI === 'true'
    ? [{ provide: getModelToken(UserMetadata.name), useValue: {} }]
    : [];
@Module({
  imports: [HttpModule, ...SCHEMA_IMPORTS],
  controllers: [UserMetadataController],
  providers: [UserMetadataService, ...FAKE_PROVIDERS],
})
export class UserMetadataModule {}
