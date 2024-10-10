import { IsArray, IsEmail, IsString, MinLength } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';
import { UserRole } from 'src/schemas/user.schema';

@InputType()
export class RegisterUserInput {
  @Field()
  @MinLength(3)
  firstName: string;

  @Field()
  @MinLength(3)
  lastName: string;

  @Field()
  @IsEmail()
  email: string;

  @Field()
  @MinLength(3)
  userName: string;

  @Field()
  @MinLength(6)
  password: string;

  @Field(() => [UserRole], { defaultValue: [UserRole.USER] })
  @IsArray()
  @IsString({ each: true })
  roles: UserRole[];
}
