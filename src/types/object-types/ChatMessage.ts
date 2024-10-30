import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MediaContent } from 'src/schemas/mediaContent.schema';
import { Message, MessageType } from 'src/schemas/message.schema';
import { User } from 'src/schemas/user.schema';

@ObjectType()
export class ChatMessages {
  @Field(() => ID)
  _id: string;

  @Field({ nullable: true })
  content?: string;

  @Field(() => MessageType)
  type: MessageType;

  @Field(() => User)
  sender: User;

  @Field(() => MediaContent, { nullable: true })
  media?: MediaContent;

  @Field()
  messageIsReaded: boolean;
}
