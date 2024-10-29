import { InputType, Field } from '@nestjs/graphql';
@InputType()
export class SignUrlInput {
  @Field()
  publicId: string;

  @Field()
  folder: string;
}
