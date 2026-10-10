import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Learning state is deliberately separate from editable profile metadata. */
@Schema({ collection: 'workshop_progress', timestamps: true })
export class WorkshopProgress {
  @Prop({ required: true, unique: true, index: true }) uuid: string;
  @Prop({ type: [String], default: [] }) startedWorkshopIds: string[];
  @Prop({ type: [String], default: [] }) completedWorkshopIds: string[];
  // Used only by the explicit isolated example; live placement comes from assessment service.
  @Prop({ type: [String], default: [] }) demoAssessmentSections: string[];
}
export const WorkshopProgressSchema =
  SchemaFactory.createForClass(WorkshopProgress);
