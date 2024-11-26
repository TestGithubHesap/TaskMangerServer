// src/post/dto/post.input.ts
import { InputType, Field, ObjectType } from '@nestjs/graphql';
@ObjectType()
export class VideoCallNotificationObject {
  @Field()
  chatId: string;

  @Field(() => [String])
  participants: string[];

  @Field()
  userName: string;
}
