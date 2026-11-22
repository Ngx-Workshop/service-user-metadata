import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { CodingLabAttemptController } from './coding-lab-attempt.controller';
import {
  CodingLabAttempt,
  CodingLabAttemptSchema,
} from './coding-lab-attempt.schema';
import { CodingLabAttemptService } from './coding-lab-attempt.service';

const generating = process.env.GENERATE_OPENAPI === 'true';

@Module({
  imports: [
    HttpModule,
    ...(generating
      ? []
      : [
          MongooseModule.forFeature([
            { name: CodingLabAttempt.name, schema: CodingLabAttemptSchema },
          ]),
        ]),
  ],
  controllers: [CodingLabAttemptController],
  providers: [
    CodingLabAttemptService,
    ...(generating
      ? [{ provide: getModelToken(CodingLabAttempt.name), useValue: {} }]
      : []),
  ],
})
export class CodingLabAttemptModule {}
