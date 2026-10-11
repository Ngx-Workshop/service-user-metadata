import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ViewedWorkshopPage {
  @Prop({ required: true }) workshopId: string;
  @Prop({ required: true }) pageId: string;
}
const ViewedWorkshopPageSchema =
  SchemaFactory.createForClass(ViewedWorkshopPage);

/** Learning state is deliberately separate from editable profile metadata. */
@Schema({ collection: 'workshop_progress', timestamps: true })
export class WorkshopProgress {
  @Prop({ required: true, unique: true, index: true }) uuid: string;
  @Prop({ type: [String], default: [] }) startedWorkshopIds: string[];
  // Legacy self-attestation records retained for compatibility; never used to grant completion.
  @Prop({ type: [String], default: [] }) completedWorkshopIds: string[];
  @Prop({ type: [ViewedWorkshopPageSchema], default: [] })
  viewedPages: ViewedWorkshopPage[];
  @Prop({ type: [String], default: [] }) demoCompletedAssessmentIds: string[];
  // Used only by the explicit isolated example; live placement comes from assessment service.
  @Prop({ type: [String], default: [] }) demoAssessmentSections: string[];
}
export const WorkshopProgressSchema =
  SchemaFactory.createForClass(WorkshopProgress);
