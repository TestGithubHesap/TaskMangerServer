import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { Chat } from 'src/schemas/chat.schema';
import { HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { GraphQLError } from 'graphql';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/schemas/user.schema';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from 'src/types/user';
import { CreateChatInput } from './dto/CreateChatInput';
@Resolver()
@UseInterceptors(GraphQLErrorInterceptor)
export class ChatResolver {
  constructor(private readonly chatService: ChatService) {}
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
  @Mutation(() => Chat)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EXECUTIVE)
  async createChat(
    @Args('input') input: CreateChatInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Chat> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }

    return this.chatService.createChat(user._id, input.participants);
  }
}
