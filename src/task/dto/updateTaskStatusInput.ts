// DTO for the mutation input
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsMongoId } from 'class-validator';
import { TaskStatus } from 'src/schemas/task.schema';

@InputType()
export class UpdateTaskStatusInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsMongoId()
  taskId: string;

  @Field(() => TaskStatus)
  @IsNotEmpty()
  status: TaskStatus;
}
