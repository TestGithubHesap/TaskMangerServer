import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Chat } from './chat.schema';

export type MessageDocument = Message & Document;

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

  @Prop({ required: true })
  @Field()
  content: string;

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
