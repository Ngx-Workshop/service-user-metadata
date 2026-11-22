import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { WorkshopProgressController } from './workshop-progress.controller';
import {
  WorkshopProgress,
  WorkshopProgressSchema,
} from './workshop-progress.schema';
import { WorkshopProgressService } from './workshop-progress.service';

const generating = process.env.GENERATE_OPENAPI === 'true';

@Module({
  imports: [
    HttpModule,
    ...(generating
      ? []
      : [
          MongooseModule.forFeature([
            { name: WorkshopProgress.name, schema: WorkshopProgressSchema },
          ]),
        ]),
  ],
  controllers: [WorkshopProgressController],
  providers: [
    WorkshopProgressService,
    ...(generating
      ? [{ provide: getModelToken(WorkshopProgress.name), useValue: {} }]
      : []),
  ],
})
export class WorkshopProgressModule {}
