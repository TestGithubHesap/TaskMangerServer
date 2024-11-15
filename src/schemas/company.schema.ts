import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type CompanyDocument = Company & Document;

@Schema({
  timestamps: true,
})
@ObjectType()
export class Company {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  @Field(() => User)
  owner: Types.ObjectId;

  @Prop({ required: true, unique: true })
  @Field()
  name: string;

  @Prop()
  @Field({ nullable: true })
  address?: string;

  @Prop()
  @Field({ nullable: true })
  phoneNumber?: string;

  @Prop()
  @Field({ nullable: true })
  website?: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
