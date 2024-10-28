import { HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { MessageService } from './message.service';
import { GraphQLError } from 'graphql';
import { Message } from 'src/schemas/message.schema';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/schemas/user.schema';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from 'src/types/user';
import { CreateMessageInput } from './dto/CreateMessageInput';
@Resolver()
@UseInterceptors(GraphQLErrorInterceptor)
export class MessageResolver {
  constructor(private readonly messageService: MessageService) {}
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

  @Mutation(() => Message)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  async addMessageToChat(
    @Args('input') input: CreateMessageInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Message> {
    if (!user) {
      return this.handleError('User not found', HttpStatus.NOT_FOUND);
    }
    return this.messageService.addMessageToChat(user._id, input);
  }
}
