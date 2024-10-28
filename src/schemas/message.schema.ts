import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Chat } from './chat.schema';

export type MessageDocument = Message & Document;
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

// Enum'u GraphQL şemasına kaydet
registerEnumType(MessageType, {
  name: 'MessageType',
  description: 'Mesaj içerik tipleri',
});

// Medya içeriği için interface
@ObjectType()
class MediaContent {
  @Field()
  @Prop()
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
}
@Schema({ timestamps: true })
@ObjectType()
export class Message {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
  @Field(() => Chat)
  chat: Types.ObjectId;

  @Prop({ type: String, enum: MessageType, required: true })
  @Field(() => MessageType)
  type: MessageType;

  @Prop({ required: false })
  @Field({ nullable: true })
  content?: string;

  @Prop({ type: MediaContent, required: false })
  @Field(() => MediaContent, { nullable: true })
  mediaContent?: MediaContent;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  @Field(() => [User])
  isRead: Types.ObjectId[];

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Prop({ default: false })
  @Field()
  isDeleted: boolean;

  @Prop({ nullable: true })
  @Field(() => String, { nullable: true })
  deletedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
