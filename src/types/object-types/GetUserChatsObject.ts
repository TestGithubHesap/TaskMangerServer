import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Message } from 'src/schemas/message.schema';
import { User } from 'src/schemas/user.schema';

@ObjectType()
export class GetUserChatsObject {
  @Field(() => ID)
  _id: string;

  @Field(() => [User])
  participants: User[];

  @Field(() => Message, { nullable: true })
  lastMessage: Message;
}