import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';
import { UserRole } from 'src/schemas/user.schema';

@InputType()
export class CreateCompanyRequestInput {
  @Field()
  @MinLength(3)
  name: string;

  @Field({ nullable: true })
  address: string;

  @Field({ nullable: true })
  phoneNumber: string;

  @Field({ nullable: true })
  website: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;
}
