import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
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
const CHANGE_USER_STATUS = 'changeUserStatus';
@Resolver('User')
@UseInterceptors(GraphQLErrorInterceptor)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
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
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    if (user.roles.includes(UserRole.ADMIN) || user._id === input._id) {
      return this.userService.userUpdate(input._id, input);
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
    return this.userService.searchUsers(input,user._id);
  }
}
