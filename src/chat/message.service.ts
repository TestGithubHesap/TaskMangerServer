import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GraphQLError } from 'graphql';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument } from 'src/schemas/chat.schema';
import {
  Message,
  MessageDocument,
  MessageType,
} from 'src/schemas/message.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import { CreateMessageInput } from './dto/CreateMessageInput';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
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

  async addMessageToChat(
    userId: string,
    input: CreateMessageInput,
  ): Promise<Message> {
    try {
      const [chat, user] = await Promise.all([
        this.chatModel.findById(input.chatId),
        this.userModel.findById(userId),
      ]);
      if (!chat || !user) {
        return this.handleError('Chat or user not found', HttpStatus.NOT_FOUND);
      }

      if (!chat.participants.includes(new Types.ObjectId(user._id))) {
        return this.handleError(
          'User is not a participant of this chat',
          HttpStatus.FORBIDDEN,
        );
      }

      const newMessage = new this.messageModel({
        sender: new Types.ObjectId(userId),
        chat: new Types.ObjectId(input.chatId),
        ...input,
      });
      await newMessage.save();

      await this.chatModel.findByIdAndUpdate(chat._id, {
        $push: { messages: newMessage._id },
      });

      return newMessage;
    } catch (error) {
      this.handleError(
        'message creation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
}
