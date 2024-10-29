// src/post/dto/post.input.ts
import { InputType, Field, ObjectType } from '@nestjs/graphql';
@ObjectType()
export class SignUrlOutput {
  @Field()
  signature: string;

  @Field()
  timestamp: number;

  @Field()
  cloudName: string;

  @Field()
  apiKey: string;
}
