import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserMetadataDocument = UserMetadata & Document;

@Schema()
export class UserMetadata extends Document {
  @Prop({ required: true, unique: true, index: true })
  uuid: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, email: true })
  email: string;

  @Prop({ required: true, email: true })
  avatarUrl: string;

  @Prop({ default: 'No description provided' })
  description: string;
}

export const UserMetadataSchema = SchemaFactory.createForClass(UserMetadata);
