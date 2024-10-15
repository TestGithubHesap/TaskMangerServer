// create-project.dto.ts
import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

@InputType()
export class CreateProjectInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsString()
  description?: string;

  //   @Field()
  //   @IsNotEmpty()
  //   @IsUUID()
  //   companyId: string;

  @Field()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]{24}$/, {
    message: 'projectManagerId must be a valid MongoDB ObjectId',
  })
  projectManagerId: string;

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  @Matches(/^[0-9a-fA-F]{24}$/, {
    each: true,
    message: 'Each teamMemberId must be a valid MongoDB ObjectId',
  })
  teamMemberIds: string[];

  @Field()
  @IsNotEmpty()
  @Matches(/^(\d{2})\.(\d{2})\.(\d{4})$/, {
    message: 'startDate must be in DD.MM.YYYY format',
  })
  startDate: string;

  @Field()
  @IsNotEmpty()
  @Matches(/^(\d{2})\.(\d{2})\.(\d{4})$/, {
    message: 'endDate must be in DD.MM.YYYY format',
  })
  endDate: string;
}
