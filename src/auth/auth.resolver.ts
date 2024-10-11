import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserInput } from 'src/auth/dto/RegisterUserInput';
import { RegisterUserObject } from 'src/types/object-types/RegisterUserObject';
import { User } from 'src/schemas/user.schema';
import { ActivationUserInput } from 'src/auth/dto/ActivationUserInput';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { LoginUserObject } from 'src/types/object-types/LoginUserObject';
import { LoginUserInput } from './dto/LoginUserInput';
import { AuthGuard } from './guards/auth.guard';
import { Response } from 'express';
import { CurrentUser } from 'src/common/decorators/user.decorator';

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
  @Mutation(() => LoginUserObject)
  async loginUser(@Args('input') input: LoginUserInput, @Context() context) {
    const { req, res } = context;
    const data = await this.authService.loginUser(input);
    if (data.refresh_token && data.access_token) {
      res.cookie('refresh_token', data.refresh_token);
      res.cookie('access_token', data.access_token);
    }
    return data;
  }

  @Query(() => String)
  @UseGuards(AuthGuard)
  async getMe(@Context() context, @CurrentUser() user) {
    const { req, res } = context;
    console.log(user);
    return 'aaa';
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async logout(@Context() context: { res: Response }) {
    const { res } = context;
    try {
      res.clearCookie('refresh_token', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
      res.clearCookie('access_token', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
      return 'successfully logged out ';
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }
}
