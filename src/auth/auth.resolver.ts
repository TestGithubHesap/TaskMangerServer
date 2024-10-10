import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserInput } from 'src/auth/dto/RegisterUserInput';
import { RegisterUserObject } from 'src/types/object-types/RegisterUserObject';
import { User } from 'src/schemas/user.schema';
import { ActivationUserInput } from 'src/auth/dto/ActivationUserInput';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';

@Resolver()
@UseInterceptors(GraphQLErrorInterceptor)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => RegisterUserObject)
  async registerUser(
    @Args('input') input: RegisterUserInput,
  ): Promise<RegisterUserObject> {
    return this.authService.registerUser(input);
  }

  @Mutation(() => User)
  async activationUser(
    @Args('input') input: ActivationUserInput,
  ): Promise<User> {
    return this.authService.activationUser(input);
  }
}
