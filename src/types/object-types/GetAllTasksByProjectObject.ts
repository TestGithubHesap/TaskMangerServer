import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Project } from 'src/schemas/project.schema';
import { Task } from 'src/schemas/task.schema';

@ObjectType()
export class GetAllTasksByProjectObject {
  @Field(() => [Task])
  tasks: Task[];

  @Field(() => Project)
  project: Project;
}
