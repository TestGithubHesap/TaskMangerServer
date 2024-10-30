import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Message } from 'src/schemas/message.schema';
import { ChatMessages } from './ChatMessage';

@ObjectType()
export class GetChatMessagesObject {
  @Field(() => [ChatMessages])
  messages: ChatMessages[];

  @Field()
  totalMessages: number;

  @Field()
  totalPages: number;

  @Field()
  currentPage: number;
}
