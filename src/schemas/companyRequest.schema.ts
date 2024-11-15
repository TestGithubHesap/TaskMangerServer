import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type CompanyRequestDocument = CompanyRequest & Document;

export enum CompanyRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELED = 'canceled',
}

registerEnumType(CompanyRequestStatus, {
  name: 'CompanyRequestStatus',
  description: 'Status of the company  request',
});
@Schema({ timestamps: true }) // createdAt ve updatedAt otomatik olarak eklenir
@ObjectType()
export class CompanyRequest {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  @Field(() => User)
  user: Types.ObjectId; // Talebi yapan kullanıcı

  @Prop({ required: true })
  @Field()
  name: string; // Talep edilen şirket adı

  @Prop()
  @Field({ nullable: true })
  address?: string; // Talep edilen şirket adresi

  @Prop()
  @Field({ nullable: true })
  phoneNumber?: string; // Talep edilen şirket telefon numarası

  @Prop()
  @Field({ nullable: true })
  website?: string; // Talep edilen şirket web sitesi

  @Prop({ required: true })
  @Field()
  description: string; // Şirket açıklaması

  @Prop({
    type: String,
    enum: CompanyRequestStatus,
    default: CompanyRequestStatus.PENDING,
  })
  @Field(() => CompanyRequestStatus)
  status: CompanyRequestStatus;

  @Prop()
  @Field({ nullable: true })
  rejectionReason?: string; // Reddetme sebebi (eğer varsa)
}

export const CompanyRequestSchema =
  SchemaFactory.createForClass(CompanyRequest);
