import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GraphQLError } from 'graphql';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument, MetadataType } from 'src/schemas/chat.schema';
import { Message, MessageDocument } from 'src/schemas/message.schema';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class ChatService {
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
  async createChat(userId: string, participants: string[]): Promise<Chat> {
    try {
      // Giriş doğrulamaları

      await this.validateChatCreation(userId, participants);

      // Katılımcıları benzersiz yap ve oluşturan kullanıcıyı ekle
      const uniqueParticipantsObjectId = [
        ...new Set([...participants, userId]),
      ].map((id) => new Types.ObjectId(id));

      const existingChat = await this.findExistingChat(
        uniqueParticipantsObjectId,
      );
      if (existingChat) {
        // Eğer sohbet silinmişse, aktif hale getir
        if (existingChat.isDeleted) {
          existingChat.isDeleted = false;
          existingChat.deletedAt = null;
          await existingChat.save();
        }
        return existingChat;
      }

      // Yeni sohbet oluştur
      const chatType =
        uniqueParticipantsObjectId.length <= 2
          ? MetadataType.DIRECT
          : MetadataType.GROUP;
      const chat = new this.chatModel({
        createdByUser: new Types.ObjectId(userId),
        participants: uniqueParticipantsObjectId,
        metadata: {
          createdAt: new Date(),
          lastActivity: new Date(),
          participantCount: uniqueParticipantsObjectId.length,
          type: chatType,
        },
      });

      const savedChat = await chat.save();

      return savedChat;
    } catch (error) {
      this.handleError(
        'Chat creation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  async findById(chatId: string): Promise<Chat> {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) {
      this.handleError('Chat not found', HttpStatus.NOT_FOUND);
    }
    return chat;
  }

  private async validateChatCreation(
    userId: string,
    participants: string[],
  ): Promise<void> {
    // Katılımcı sayısı kontrolü
    if (!participants || participants.length === 0) {
      this.handleError(
        'At least one participant is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (participants.length > 50) {
      this.handleError(
        'Maximum number of participants exceeded',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Geçerli kullanıcı ID'leri kontrolü
    if (!Types.ObjectId.isValid(userId)) {
      this.handleError('Invalid user ID', HttpStatus.BAD_REQUEST);
    }

    // const invalidIds = participants.filter((id) => !Types.ObjectId.isValid(id));
    // if (invalidIds.length > 0) {
    //   this.handleError(
    //     `Invalid participant IDs: ${invalidIds.join(', ')}`,
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    // Kullanıcıların varlığını kontrol et
    const users = await this.userModel.find({
      _id: { $in: [...participants, userId] },
    });
    const uniqueParticipants = [...new Set([...participants, userId])];
    if (users.length !== uniqueParticipants.length) {
      this.handleError('Some users were not found', HttpStatus.BAD_REQUEST);
    }
  }

  private async findExistingChat(
    participants: Types.ObjectId[],
  ): Promise<ChatDocument | null> {
    // Aynı katılımcılara sahip aktif bir sohbet var mı kontrol et
    return await this.chatModel.findOne({
      participants: {
        $all: participants,
        $size: participants.length,
      },
      // 'metadata.type':
      //   participants.length === 2 ? MetadataType.DIRECT : MetadataType.GROUP,
    });
  }
}
