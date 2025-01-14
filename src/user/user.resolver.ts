import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { UserService } from './user.service';
import { User, UserRole } from 'src/schemas/user.schema';
import { UpdateUserInput } from './dto/updateUserInput';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { HttpStatus, Inject, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from 'src/types/user';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { GraphQLError } from 'graphql';
import { ChangeUserStatusObject } from 'src/types/object-types/ChangeUserStatusObject';
import { PUB_SUB } from 'src/modules/pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { SearchUsersInput } from './dto/searchUsersInput';
import { SearchUsersObject } from 'src/types/object-types/SearchUsersObject';
import { Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { GetUserProfileObject } from 'src/types/object-types/GetUserProfileObject';
const CHANGE_USER_STATUS = 'changeUserStatus';
const CHANGE_USER_ROLE = 'changeUserRole';
@Resolver('User')
@UseInterceptors(GraphQLErrorInterceptor)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
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
  @Mutation(() => User)
  @UseGuards(AuthGuard)
  async updateUser(
    @Args('input') input: UpdateUserInput,
    @CurrentUser() user: AuthUser,
  ): Promise<User> {
    if (user.roles.includes(UserRole.ADMIN) || user._id === input._id) {
      return this.userService.userUpdate(input);
    } else {
      this.handleError(
        'you are not authorized to update this user',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  @Query(() => [User])
  @UseGuards(AuthGuard)
  async getCompanyUsers(@CurrentUser() user: AuthUser): Promise<User[]> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }

    return this.userService.getCompanyUsers(user._id);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async updateUserStatus(
    @Args('status') status: string,
    @CurrentUser() user: AuthUser,
  ): Promise<boolean> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }

    return await this.userService.updateUserStatus(user._id, status);
  }

  @UseGuards(AuthGuard)
  @Subscription(() => ChangeUserStatusObject, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        this.handleError('user not found', HttpStatus.NOT_FOUND);
      }

      return payload.changeUserStatus.userId == variables.userId;
    },
  })
  changeUserStatus(@Args('userId') userId: string) {
    return this.pubSub.asyncIterator(CHANGE_USER_STATUS);
  }

  @Query(() => SearchUsersObject)
  @UseGuards(AuthGuard)
  async searchUsers(
    @Args('input') input: SearchUsersInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.searchUsers(input, user._id);
  }

  @UseGuards(AuthGuard)
  @Subscription(() => User, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      const user = req?.user as AuthUser;
      if (!user) {
        this.handleError('user not found', HttpStatus.NOT_FOUND);
      }

      return payload.changeUserRole._id == user._id;
    },
  })
  async changeUserRole(
    @CurrentUser() user: AuthUser,
    @Context() context: { req: Request; res: Response },
  ) {
    return this.pubSub.asyncIterator(CHANGE_USER_ROLE);
  }
  @Mutation(() => User)
  @UseGuards(AuthGuard)
  async uploadProfilePhoto(
    @CurrentUser() user: AuthUser,
    @Args('profilePhoto') profilePhoto: string,
  ) {
    return await this.userService.uploadProfilePhoto(profilePhoto, user._id);
  }

  @Query(() => GetUserProfileObject)
  @UseGuards(AuthGuard)
  async getUserProfile(
    @Args('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.getUserProfile(userId, user._id);
  }
}
