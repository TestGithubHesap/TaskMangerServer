// create-task.dto.ts
import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { TaskPriority, TaskStatus } from 'src/schemas/task.schema';

@InputType()
export class CreateTaskInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'projectId must be a valid MongoDB ObjectId',
  })
  projectId: string;

  @Field()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'assigneeId must be a valid MongoDB ObjectId',
  })
  assigneeId: string;

  @Field(() => TaskStatus)
  @IsNotEmpty()
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @Field(() => TaskPriority)
  @IsNotEmpty()
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @Field()
  @IsNotEmpty()
  @Matches(/^(\d{2})\.(\d{2})\.(\d{4})$/, {
    message: 'dueDate must be in DD.MM.YYYY format',
  })
  dueDate: string;
}
