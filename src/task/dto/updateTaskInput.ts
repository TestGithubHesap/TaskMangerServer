// DTO for the mutation input
import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsMongoId,
  IsString,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import { TaskPriority, TaskStatus } from 'src/schemas/task.schema';

@InputType()
export class UpdateTaskInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsMongoId()
  taskId: string; // taskId güncelleme için zorunlu alan olarak kalacak

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string; // İsteğe bağlı hale getirildi

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsMongoId()
  assignee?: string;

  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @Field(() => TaskPriority, { nullable: true })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^(\d{2})\.(\d{2})\.(\d{4})$/, {
    message: 'dueDate must be in DD.MM.YYYY format',
  })
  dueDate?: string;
}
