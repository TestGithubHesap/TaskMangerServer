import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Task } from 'src/schemas/task.schema';

@ObjectType()
export class GetProjectDetailObject {
  @Field(() => ID)
  _id: string;

  @Field(() => [Task], { nullable: true })
  tasks: Task[];
}
