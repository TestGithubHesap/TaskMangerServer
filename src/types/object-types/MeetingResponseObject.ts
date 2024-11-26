import { Field, ObjectType } from '@nestjs/graphql';
import { LinksResponse } from './LinksResponseObject';

@ObjectType()
export class MeetingResponseObject {
  @Field()
  apiKey: string;

  @Field()
  customMeetingId: string;

  @Field()
  roomId: string;

  @Field()
  customRoomId: string;

  @Field()
  disabled: boolean;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Field(() => LinksResponse)
  links: LinksResponse;

  @Field()
  id: string;
}
