import {
  Args,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { Chat } from 'src/schemas/chat.schema';
import { HttpStatus, Inject, UseGuards, UseInterceptors } from '@nestjs/common';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { GraphQLError } from 'graphql';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/schemas/user.schema';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from 'src/types/user';
import { CreateChatInput } from './dto/CreateChatInput';
import { Message } from 'src/schemas/message.schema';
import { PUB_SUB } from 'src/modules/pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Types } from 'mongoose';
import { GetUserChatsObject } from 'src/types/object-types/GetUserChatsObject';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { SignUrlOutput } from 'src/types/object-types/SignUrlObject';
import { SignUrlInput } from './dto/SignUrlInput';
import { ChatMessages } from 'src/types/object-types/ChatMessage';
import { GetChatUsersObject } from './dto/GetChatUsersObject';

const ADD_MESSAGE = 'addMessageToChat';

@Resolver()
@UseInterceptors(GraphQLErrorInterceptor)
export class ChatResolver {
  constructor(
    private readonly chatService: ChatService,
    private readonly cloudinaryService: CloudinaryService,
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

    return this.chatService.createChat(user._id, input);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  @Subscription(() => ChatMessages, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        this.handleError('user not found', HttpStatus.NOT_FOUND);
      }

      return payload.addMessageToChat.chatId == variables.chatId;
    },
  })
  async addMessageToChat(
    @Args('chatId') chatId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const chat = await this.chatService.findById(chatId);
    const isParticipant = chat.participants.some(
      (participant) => participant.toString() === user._id,
    );

    if (!isParticipant) {
      this.handleError(
        'User is not a participant of this chat',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.pubSub.asyncIterator(ADD_MESSAGE);
  }

  @Query(() => [GetUserChatsObject])
  @UseGuards(AuthGuard)
  async getChats(@CurrentUser() user: AuthUser) {
    return this.chatService.getChats(user._id);
  }
  @Mutation(() => SignUrlOutput)
  @UseGuards(AuthGuard)
  async generateSignedUploadUrl(
    @Args('input') input: SignUrlInput,
  ): Promise<SignUrlOutput> {
    const { signature, timestamp } =
      await this.cloudinaryService.generateSignature(
        input.publicId,
        input.folder,
      );
    return {
      signature,
      timestamp,
      cloudName: process.env.CLD_CLOUD_NAME,
      apiKey: process.env.CLD_API_KEY,
    };
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async leaveChat(
    @Args('chatId') chatId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.leaveChat(user._id, chatId);
  }

  @Query(() => GetChatUsersObject)
  @UseGuards(AuthGuard)
  async getChatUsers(
    @Args('chatId') chatId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.getChatUsers(user._id, chatId);
  }

  @Mutation(() => Chat)
  @UseGuards(AuthGuard)
  async addChatAdmin(
    @Args('chatId', { type: () => String }) chatId: string,
    @Args('userId', { type: () => String }) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.addAdmin(chatId, userId, user._id);
  }

  @Mutation(() => Chat)
  @UseGuards(AuthGuard)
  async removeChatAdmin(
    @Args('chatId', { type: () => String }) chatId: string,
    @Args('userId', { type: () => String }) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    console.log(chatId, userId);
    return this.chatService.removeAdmin(chatId, userId, user._id);
  }

  @Mutation(() => Chat)
  @UseGuards(AuthGuard)
  async removeChatParticipant(
    @Args('chatId', { type: () => String }) chatId: string,
    @Args('userId', { type: () => String }) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.removeParticipant(chatId, userId, user._id);
  }

  @Mutation(() => Chat)
  @UseGuards(AuthGuard)
  async addChatParticipant(
    @Args('chatId', { type: () => String }) chatId: string,
    @Args('userId', { type: () => String }) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.addParticipant(chatId, userId, user._id);
  }

  @Mutation(() => Chat)
  @UseGuards(AuthGuard)
  async updateChatName(
    @Args('chatId', { type: () => String }) chatId: string,
    @Args('name', { type: () => String }) name: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.updateChatName(chatId, name, user._id, user.roles);
  }

  @Mutation(() => Chat)
  @UseGuards(AuthGuard)
  async freezeChat(
    @Args('chatId', { type: () => String }) chatId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.freezeChat(chatId, user._id, user.roles);
  }
}
