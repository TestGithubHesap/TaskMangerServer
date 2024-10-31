import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserInput } from 'src/auth/dto/RegisterUserInput';
import { RegisterUserObject } from 'src/types/object-types/RegisterUserObject';
import { User, UserRole } from 'src/schemas/user.schema';
import { ActivationUserInput } from 'src/auth/dto/ActivationUserInput';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { LoginUserObject } from 'src/types/object-types/LoginUserObject';
import { LoginUserInput } from './dto/LoginUserInput';
import { AuthGuard } from '../common/guards/auth.guard';
import { Response } from 'express';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from '../types/user';
import { GraphQLError } from 'graphql';
import { RolesGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResetPasswordInput } from './dto/ResetPasswordInput';
import { UserService } from 'src/user/user.service';

@Resolver()
@UseInterceptors(GraphQLErrorInterceptor)
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new GraphQLError(message, {
      extensions: {
        code: statusCode,
        error,
      },
    });
  }
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

  @Query(() => User)
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: AuthUser) {
    console.log('hell');
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }

    const data = this.authService.getMe(user._id);
    return data;
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async logout(
    @Context() context: { res: Response },
    @CurrentUser() user: AuthUser,
  ) {
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
      await this.userService.updateUserStatus(user._id, 'offline');
      return 'successfully logged out ';
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  @Query(() => String)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rolecheck(@CurrentUser() user: AuthUser) {
    console.log(user);
    return 'asaslas';
  }

  @Mutation(() => String)
  async forgotPassword(@Args('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Mutation(() => String)
  async resetPassword(@Args('input') input: ResetPasswordInput) {
    return this.authService.resetPassword(input.password, input.token);
  }
}
