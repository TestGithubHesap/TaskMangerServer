import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TaskSummary {
  @Field(() => Int)
  totalTasks: number;

  @Field(() => Int)
  todoTasks: number;

  @Field(() => Int)
  in_progressTasks: number;

  @Field(() => Int)
  doneTasks: number;

  @Field(() => Int)
  reviewTasks: number;
}
