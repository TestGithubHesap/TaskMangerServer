import { InputType, Field, ID } from '@nestjs/graphql';
import { IsOptional, IsString, IsEmail, IsEnum } from 'class-validator';
import { UserRole } from 'src/schemas/user.schema';

@InputType()
export class UpdateUserInput {
  @Field(() => ID)
  _id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  profilePhoto?: string;

  @Field(() => [UserRole], { nullable: true })
  @IsOptional()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  status?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  company?: string;

  @Field({ nullable: true })
  @IsOptional()
  isCompanyAdmin?: boolean;
}
