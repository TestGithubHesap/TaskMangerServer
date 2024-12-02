import {
  createUnionType,
  Field,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { GraphQLResolveInfo } from 'graphql';
import { Company } from './company.schema';
import { Task } from './task.schema';
import { Project } from './project.schema';
export enum NotificationType {
  TASK = 'task',
  PROJECT = 'project',
  COMPANY = 'company',
  VIDEO_CALL = 'video_call',
  DIRECT_MESSAGE = 'direct_message',
}
interface NotificationRootValue {
  contentType: string;
}
export const Content = createUnionType({
  name: 'Content',
  types: () => [Project, Task, Company, User],
  resolveType(value: any, context: any) {
    // contentType bilgisini kontrol et
    const contentType = value.__typename;

    if (contentType) {
      switch (contentType) {
        case 'Project':
          return Project;
        case 'Task':
          return Task;
        case 'Company':
          return Company;
        case 'User':
          return User;
      }
    }

    // Eğer contentType yoksa value üzerinden kontrol et
    if (value) {
      if ('userName' in value) return User;
      if ('name' in value) return Project;
      if ('title' in value && 'project' in value) return Task;
      if ('owner' in value) return Company;
    }

    return null;
  },
});
registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: 'Type of notification content',
});

@Schema({ timestamps: true })
@ObjectType()
export class Notification extends Document {
  @Field(() => ID)
  _id: string;

  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'User',
      },
    ],
    required: true,
  })
  @Field(() => [User])
  recipients: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  sender: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  @Field(() => NotificationType)
  type: NotificationType;

  @Prop({ type: Types.ObjectId, refPath: 'contentType' })
  @Field(() => Content, { nullable: true })
  content: Types.ObjectId;

  @Prop({ type: String, enum: ['Task', 'Project', 'User', 'Company'] })
  @Field()
  contentType: string;

  @Prop({ type: String })
  @Field()
  message: string;

  @Prop({ type: Boolean, default: false })
  @Field()
  isRead: boolean;

  @Prop({ type: Date, default: Date.now, expires: 172800 })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
export type NotificationDocument = Notification & Document;
