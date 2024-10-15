import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Project } from './project.schema';

// Görev Durumu Enum
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
}

registerEnumType(TaskStatus, {
  name: 'TaskStatus',
  description: 'Task statuses',
});

// Görev Önceliği Enum
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

registerEnumType(TaskPriority, {
  name: 'TaskPriority',
  description: 'Task priorities',
});

// Görev Şeması
@Schema({ timestamps: true })
@ObjectType()
export class Task {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  title: string;

  @Prop()
  @Field({ nullable: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  @Field(() => Project)
  project: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  assignee: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Task', nullable: true })
  @Field(() => Task, { nullable: true })
  parentTask?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }] })
  @Field(() => [Task])
  subTasks: Types.ObjectId[];

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.TODO })
  @Field(() => TaskStatus)
  status: TaskStatus;

  @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM })
  @Field(() => TaskPriority)
  priority: TaskPriority;

  @Prop()
  @Field(() => String)
  dueDate: Date;

  @Prop()
  @Field(() => String, { nullable: true })
  completedAt?: Date;

  @Field(() => String)
  createdAt: Date;

  @Field(() => String)
  updatedAt: Date;
}

export type TaskDocument = Task & Document;
export const TaskSchema = SchemaFactory.createForClass(Task);
