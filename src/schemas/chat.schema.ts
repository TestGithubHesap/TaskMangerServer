import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Message } from './message.schema';

export type ChatDocument = Chat & Document;

export enum MetadataType {
  DIRECT = 'direct',
  GROUP = 'group',
}
registerEnumType(MetadataType, {
  name: 'MetadataType',
  description: 'Chat Metadata Type',
});

export interface IChatMetadata {
  createdAt: Date;
  lastActivity: Date;
  participantCount: number;
  type: MetadataType;
}
@Schema({ _id: false })
@ObjectType()
export class ChatMetadata {
  @Prop()
  @Field()
  createdAt: Date;

  @Prop()
  @Field()
  lastActivity: Date;

  @Prop()
  @Field()
  participantCount: number;

  @Prop({ type: String, enum: MetadataType })
  @Field(() => MetadataType)
  type: MetadataType;
}

@Schema({ timestamps: true })
@ObjectType()
export class Chat {
  @Field(() => ID)
  _id: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  @Field(() => [User])
  participants: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] }) // Yeni eklenen admin alanı
  @Field(() => [User])
  admins: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }] })
  @Field(() => [Message])
  messages: Types.ObjectId[];

  @Prop({ type: String })
  @Field(() => String, { nullable: true })
  chatName?: string;

  @Prop({ default: false })
  @Field()
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  createdByUser: Types.ObjectId;

  @Prop({ nullable: true })
  @Field(() => String, { nullable: true })
  deletedAt?: Date;

  @Prop({ type: Object })
  @Field(() => ChatMetadata)
  metadata: IChatMetadata;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);

// ChatSchema.index({ 'metadata.lastActivity': -1 });
// ChatSchema.index({ participants: 1 });
// ChatSchema.index({ createdByUser: 1 });
// ChatSchema.index({ 'metadata.type': 1 });
