import { ObservabilityModule } from './observability/observability.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserMetadataModule } from './user-metadata/user-metadata.module';
import { CodingLabAttemptModule } from './coding-lab-attempts/coding-lab-attempt.module';
import { WorkshopProgressModule } from './workshop-progress/workshop-progress.module';
import { UserMetadataAccessModule } from './local-development/user-metadata-access.module';

const DB_IMPORTS =
  process.env.GENERATE_OPENAPI === 'true'
    ? []
    : [
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            uri: config.get<string>('MONGODB_URI'),
            serverSelectionTimeoutMS: 5000, // Timeout in 5 seconds
          }),
        }),
      ];

@Module({
  imports: [
    ObservabilityModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ...DB_IMPORTS,
    UserMetadataAccessModule,
    UserMetadataModule,
    WorkshopProgressModule,
    CodingLabAttemptModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
