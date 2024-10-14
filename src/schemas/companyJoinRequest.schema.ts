import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Company } from './company.schema';

export type CompanyJoinRequestDocument = CompanyJoinRequest & Document;

export enum JoinRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

registerEnumType(JoinRequestStatus, {
  name: 'JoinRequestStatus',
  description: 'Status of the company join request',
});

@Schema({
  timestamps: true,
})
@ObjectType()
export class CompanyJoinRequest {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  @Field(() => Company)
  company: Types.ObjectId;

  @Prop({
    type: String,
    enum: JoinRequestStatus,
    default: JoinRequestStatus.PENDING,
  })
  @Field(() => JoinRequestStatus)
  status: JoinRequestStatus;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

export const CompanyJoinRequestSchema =
  SchemaFactory.createForClass(CompanyJoinRequest);
