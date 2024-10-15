import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User, UserRole } from 'src/schemas/user.schema';
import { UpdateUserInput } from './dto/updateUserInput';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from 'src/types/user';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { GraphQLError } from 'graphql';
@Resolver('User')
@UseInterceptors(GraphQLErrorInterceptor)
export class UserResolver {
  constructor(private readonly userService: UserService) {}
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
}
