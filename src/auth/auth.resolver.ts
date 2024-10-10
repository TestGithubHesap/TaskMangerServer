import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserInput } from 'src/types/InputTypes/RegisterUserInput';
import { RegisterUserObject } from 'src/types/ObjectTypes/RegisterUserObject';
import { User } from 'src/schemas/user.schema';
import { ActivationUserInput } from 'src/types/InputTypes/ActivationUserInput';
import { GraphQLErrorInterceptor } from 'src/interceptors/graphql-error.interceptor';

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
  async activateUser(@Args('input') input: ActivationUserInput): Promise<User> {
    return this.authService.activationUser(input);
  }
}
