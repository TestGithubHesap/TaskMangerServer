import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, MinLength } from 'class-validator';

@InputType()
export class GetChatMessagesInput {
  @Field()
  chatId: string;

  @Field()
  page: number;

  @Field()
  limit: number;

  @Field({ nullable: true })
  extraPassValue?: number;
}
