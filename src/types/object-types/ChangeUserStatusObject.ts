import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChangeUserStatusObject {
  @Field(() => ID)
  userId: string;

  @Field()
  status: string;
}
