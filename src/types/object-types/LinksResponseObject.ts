import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LinksResponse {
  @Field()
  get_room: string;

  @Field()
  get_session: string;
}
