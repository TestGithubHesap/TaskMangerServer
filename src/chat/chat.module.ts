import { Module } from '@nestjs/common';
import { ChatResolver } from './chat.resolver';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Chat, ChatSchema } from 'src/schemas/chat.schema';
import { Message, MessageSchema } from 'src/schemas/message.schema';
import { AuthModule } from 'src/auth/auth.module';
import { MessageService } from './message.service';
import { MessageResolver } from './message.resolver';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Chat.name, schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  providers: [ChatResolver, MessageResolver, ChatService, MessageService],
})
export class ChatModule {}
