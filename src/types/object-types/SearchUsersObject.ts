import { Field, ID, ObjectType } from '@nestjs/graphql';
import { User } from 'src/schemas/user.schema';

@ObjectType()
export class SearchUsersObject {
  @Field(() => [User])
  users: User[];

  @Field()
  totalCount: number;
}
