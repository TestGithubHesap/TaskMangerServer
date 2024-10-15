import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Company } from './company.schema';

export enum ProjectStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

registerEnumType(ProjectStatus, {
  name: 'ProjectStatus',
  description: 'Project statuses',
});
@Schema({ timestamps: true })
@ObjectType()
export class Project {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  name: string;

  @Prop()
  @Field({ nullable: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  @Field(() => Company)
  company: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  projectManager: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  @Field(() => [User])
  team: Types.ObjectId[];

  @Prop()
  @Field(() => String)
  startDate: Date;

  @Prop()
  @Field(() => String)
  endDate: Date;

  @Prop({ type: String, enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  @Field(() => ProjectStatus)
  status: ProjectStatus;

  @Field(() => String)
  createdAt: Date;

  @Field(() => String)
  updatedAt: Date;
}

export type ProjectDocument = Project & Document;
export const ProjectSchema = SchemaFactory.createForClass(Project);
