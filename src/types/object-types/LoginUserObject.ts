import { User } from '../../schemas/user.schema';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoginUserObject {
  @Field(() => User, { nullable: true })
  user: User;

  @Field()
  access_token: string;

  @Field()
  refresh_token: string;
}
