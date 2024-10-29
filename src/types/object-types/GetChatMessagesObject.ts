import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Message } from 'src/schemas/message.schema';

@ObjectType()
export class GetChatMessagesObject {
  @Field(() => [Message])
  messages: Message[];

  @Field()
  totalMessages: number;

  @Field()
  totalPages: number;

  @Field()
  currentPage: number;
}
