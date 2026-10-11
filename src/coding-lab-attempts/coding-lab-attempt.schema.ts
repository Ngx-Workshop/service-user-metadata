import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongoSchema } from 'mongoose';
import { LabAttemptResultDto } from './coding-lab-attempt.dto';
@Schema({ collection: 'coding_lab_attempts' })
export class CodingLabAttempt {
  @Prop({ required: true }) uuid: string;
  @Prop({ required: true }) requestId: string;
  @Prop({ required: true }) labId: string;
  @Prop({ required: true }) versionId: string;
  @Prop({ required: true }) versionNumber: number;
  @Prop({ required: true }) title: string;
  @Prop({ default: '' }) code: string;
  @Prop({ default: 0 }) revision: number;
  @Prop({ default: 'in-progress' }) status: string;
  @Prop({ required: true }) startedAt: string;
  @Prop({ required: true }) updatedAt: string;
  @Prop({ type: MongoSchema.Types.Mixed }) result?: LabAttemptResultDto;
  @Prop() leaseToken?: string;
  @Prop() leaseUntil?: Date;
}
export const CodingLabAttemptSchema =
  SchemaFactory.createForClass(CodingLabAttempt);
CodingLabAttemptSchema.index({ uuid: 1, requestId: 1 }, { unique: true });
CodingLabAttemptSchema.index(
  { uuid: 1, labId: 1 },
  { unique: true, partialFilterExpression: { status: 'in-progress' } }
);
CodingLabAttemptSchema.index({ uuid: 1, updatedAt: -1 });
