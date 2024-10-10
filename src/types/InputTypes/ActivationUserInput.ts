import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class ActivationUserInput {
  @Field()
  activationToken: string;

  @Field()
  activationCode: string;
}