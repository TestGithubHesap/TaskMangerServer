// media-content.schema.ts
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type MediaContentDocument = MediaContent & Document;

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
}

registerEnumType(MediaType, {
  name: 'MediaType',
  description: 'Medya dosya tipleri',
});

@Schema({ timestamps: true })
@ObjectType()
export class MediaContent {
  @Field(() => ID)
  _id: string;

  @Field(() => MediaType)
  @Prop({ type: String, enum: MediaType, required: true })
  type: MediaType;

  @Field()
  @Prop({ required: true })
  url: string;

  @Field({ nullable: true })
  @Prop()
  thumbnail?: string;

  @Field({ nullable: true })
  @Prop()
  duration?: number;

  @Field({ nullable: true })
  @Prop()
  size?: number;

  @Field({ nullable: true })
  @Prop()
  mimeType?: string;

  @Field({ nullable: true })
  @Prop()
  fileName?: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

export const MediaContentSchema = SchemaFactory.createForClass(MediaContent);
