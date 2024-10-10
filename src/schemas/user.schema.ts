import {
  Field,
  HideField,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;
export enum UserRole {
  ADMIN = 'admin',
  WORKER = 'worker',
  EXECUTIVE = 'executive',
  USER = 'user',
}


registerEnumType(UserRole, {
  name: 'UserRole', 
  description: 'User roles',
});

@Schema({
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    },
  },
  timestamps: true, 
})
@ObjectType() 
export class User {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field() 
  firstName: string;

  @Prop({ required: true })
  @Field()
  lastName: string;

  @Prop({ required: true, unique: true })
  @Field()
  userName: string;

  @Prop({ required: true, unique: true })
  @Field()
  email: string;

  @Prop({ required: true })
  @HideField() 
  password: string;

  @Prop()
  @Field({ nullable: true }) 
  profilePhoto: string;

  @Prop({ type: [String], enum: UserRole, default: [UserRole.USER] })
  @Field(() => [UserRole]) 
  roles: UserRole[];

  @Prop({ default: false })
  @Field()
  isDeleted: boolean;

  @Prop({ nullable: true })
  @Field(() => String, { nullable: true }) 
  deletedAt?: Date;

  @Field() 
  createdAt: string;

  @Field() 
  updatedAt: string;

  @Prop({ required: true, default: 'offline' })
  @Field()
  status: string;

}

export const UserSchema = SchemaFactory.createForClass(User);
