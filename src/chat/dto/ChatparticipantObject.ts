import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatParticipantObject {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: true })
  status: string;

  @Field(() => Boolean)
  isAdmin: boolean;

  @Field(() => String)
  userName: string;

  @Field(() => String, { nullable: true })
  profilePhoto: string;
}
