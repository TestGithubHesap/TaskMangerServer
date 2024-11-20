import { InputType, Field } from '@nestjs/graphql';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateChatInput {
  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 participants are required.' })
  @IsMongoId({ each: true })
  participants: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  chatName?: string;
}
