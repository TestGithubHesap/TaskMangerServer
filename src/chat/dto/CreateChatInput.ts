import { InputType, Field } from '@nestjs/graphql';
import { IsArray, IsEmail, IsMongoId, MinLength } from 'class-validator';

@InputType()
export class CreateChatInput {
  @Field(() => [String])
  @IsArray()
  @IsMongoId({ each: true })
  participants: string[];
}
