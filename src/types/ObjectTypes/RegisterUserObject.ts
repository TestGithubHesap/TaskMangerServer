import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RegisterUserObject {
  @Field()
  activationToken: string;
}
