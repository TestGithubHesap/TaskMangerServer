// DTO for the mutation input
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsMongoId } from 'class-validator';

@InputType()
export class UpdateTaskHierarchyInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsMongoId()
  taskId: string;

  @Field(() => ID)
  @IsNotEmpty()
  @IsMongoId()
  parentTaskId: string;
}
