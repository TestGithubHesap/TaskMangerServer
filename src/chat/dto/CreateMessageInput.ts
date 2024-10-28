import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';
import { MessageType } from 'src/schemas/message.schema';
import { MediaContentInput } from './MediaContentInput';

@InputType()
export class CreateMessageInput {
  @Field()
  @IsMongoId()
  chatId: string;

  @Field(() => MessageType)
  @IsEnum(MessageType)
  type: MessageType;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  content?: string;

  @Field(() => MediaContentInput, { nullable: true })
  @ValidateNested()
  @IsOptional()
  mediaContent?: MediaContentInput;
}
