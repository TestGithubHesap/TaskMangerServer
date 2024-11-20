import { User } from '../../schemas/user.schema';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GetUserProfileObject extends User {
  @Field({ nullable: true })
  chatId: string;

}
