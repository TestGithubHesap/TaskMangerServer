import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ChatParticipantObject } from './ChatparticipantObject';

@ObjectType()
export class GetChatUsersObject {
  @Field(() => ID)
  _id: string;

  @Field(() => [ChatParticipantObject])
  participants: ChatParticipantObject;
}
