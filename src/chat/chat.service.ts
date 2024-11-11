import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GraphQLError } from 'graphql';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument, MetadataType } from 'src/schemas/chat.schema';
import {
  Message,
  MessageDocument,
  MessageType,
} from 'src/schemas/message.schema';
import { User, UserDocument, UserRole } from 'src/schemas/user.schema';
import { CreateChatInput } from './dto/CreateChatInput';

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
  async createChat(userId: string, input: CreateChatInput): Promise<Chat> {
    try {
      // Giriş doğrulamaları

      await this.validateChatCreation(userId, input.participants);

      // Katılımcıları benzersiz yap ve oluşturan kullanıcıyı ekle
      const uniqueParticipantsObjectId = [
        ...new Set([...input.participants, userId]),
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
        chatName: input.chatName,
        admins: [new Types.ObjectId(userId)],
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

  async getChats(userId: string) {
    const chats = await this.chatModel.aggregate([
      {
        $match: {
          participants: new Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participants',
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { userId: new Types.ObjectId(userId) },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$userId'] },
              },
            },
            {
              $project: {
                roles: 1,
              },
            },
          ],
          as: 'currentUser',
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'messages',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                type: MessageType.TEXT,
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: 'sender',
                foreignField: '_id',
                as: 'sender',
              },
            },
            { $unwind: '$sender' },
            {
              $project: {
                content: 1,
                createdAt: 1,
                'mediaContent.url': 1,
                'sender._id': 1,
              },
            },
          ],
          as: 'lastMessage',
        },
      },
      {
        $project: {
          chatName: 1,
          admins: 1, // admins alanını koruyoruz
          participants: {
            $filter: {
              input: '$participants',
              as: 'participant',
              cond: {
                $ne: ['$$participant._id', new Types.ObjectId(userId)],
              },
            },
          },
          lastMessage: { $arrayElemAt: ['$lastMessage', 0] },
          isAdmin: {
            $or: [
              { $in: [new Types.ObjectId(userId), '$admins'] },
              {
                $in: [
                  UserRole.ADMIN,
                  {
                    $ifNull: [{ $arrayElemAt: ['$currentUser.roles', 0] }, []],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          chatName: 1,
          'participants._id': 1,
          'participants.status': 1,
          'participants.userName': 1,
          'participants.profilePhoto': 1,
          lastMessage: 1,
          isAdmin: 1,
        },
      },
    ]);

    return chats;
  }

  async leaveChat(userId: string, chatId: string) {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const chat = await this.chatModel.updateOne(
        { _id: chatId, participants: { $in: [userObjectId] } },
        { $pull: { participants: userObjectId } },
      );
      if (chat.modifiedCount < 1) {
        this.handleError(
          'You are not a participant of this chat',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Katılımcı sayısını kontrol et
      const updatedChat = await this.chatModel.findOne({ _id: chatId });
      if (updatedChat && updatedChat.participants.length === 0) {
        await this.chatModel.deleteOne({ _id: chatId });
        return 'chat deleted because no participants left';
      }

      return 'user left chat';
    } catch (error) {
      this.handleError(
        'Error while leaving chat',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async getChatUsers(userId: string, chatId: string) {
    const chat = await this.chatModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(chatId),
          participants: new Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participants',
        },
      },
      {
        $addFields: {
          participants: {
            $map: {
              input: '$participants',
              as: 'participant',
              in: {
                $mergeObjects: [
                  '$$participant',
                  {
                    isAdmin: {
                      $in: ['$$participant._id', '$admins'],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          chatName: 1,
          'participants._id': 1,
          'participants.status': 1,
          'participants.userName': 1,
          'participants.profilehPoto': 1,
          'participants.isAdmin': 1,
        },
      },
      {
        $addFields: {
          participants: {
            $sortArray: { input: '$participants', sortBy: { userName: 1 } },
          },
        },
      },
    ]);

    if (
      chat.length === 0 ||
      chat[0].participants === null ||
      chat[0].participants.length === 0
    ) {
      this.handleError('users not found', HttpStatus.NOT_FOUND);
    }
    return chat[0];
  }

  async addAdmin(
    chatId: string,
    userId: string,
    currentUserId: string,
  ): Promise<Chat> {
    const chat = await this.chatModel.findById(chatId);

    if (!chat) {
      this.handleError('Chat not found', HttpStatus.NOT_FOUND);
    }

    // Check if current user is the creator or an admin
    if (
      // !chat.createdByUser.equals(currentUserId) &&
      !chat.admins.some((adminId) => adminId.equals(currentUserId))
    ) {
      this.handleError(
        'You are not the creator or an admin',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user is a participant
    if (
      !chat.participants.some((participantId) => participantId.equals(userId))
    ) {
      this.handleError(
        'User must be a participant to become admin',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user is already an admin
    if (chat.admins.some((adminId) => adminId.equals(userId))) {
      this.handleError('User is already an admin', HttpStatus.FORBIDDEN);
    }

    // Add user to admins array
    chat.admins.push(new Types.ObjectId(userId));
    return chat.save();
  }

  async removeAdmin(
    chatId: string,
    userId: string,
    currentUserId: string,
  ): Promise<ChatDocument> {
    const chat = await this.chatModel.findById(chatId);
    if (!chat.admins.some((adminId) => adminId.equals(currentUserId))) {
      this.handleError(
        'You are not the creator or an admin',
        HttpStatus.FORBIDDEN,
      );
    }
    if (!chat) {
      this.handleError('Chat not found', HttpStatus.NOT_FOUND);
    }

    // // Check if current user is the creator
    // if (!chat.createdByUser.equals(currentUserId)) {
    //   this.handleError('You are not the creator', HttpStatus.FORBIDDEN);
    // }

    // Cannot remove the creator from admins
    if (chat.createdByUser.equals(userId)) {
      this.handleError(
        'Cannot remove the creator from admins',
        HttpStatus.FORBIDDEN,
      );
    }

    // Remove user from admins array
    chat.admins = chat.admins.filter((adminId) => !adminId.equals(userId));
    return chat.save();
  }

  async removeParticipant(
    chatId: string,
    userId: string,
    currentUserId: string,
  ) {
    const chat = await this.chatModel.findById(chatId);

    if (!chat) {
      this.handleError('Chat not found', HttpStatus.NOT_FOUND);
    }

    if (!chat.admins.some((adminId) => adminId.equals(currentUserId))) {
      this.handleError(
        'You are not the creator or an admin',
        HttpStatus.FORBIDDEN,
      );
    }

    // Cannot remove the creator from admins
    if (chat.createdByUser.equals(userId)) {
      this.handleError(
        'Cannot remove the creator from admins',
        HttpStatus.FORBIDDEN,
      );
    }

    chat.admins = chat.admins.filter((adminId) => !adminId.equals(userId));
    chat.participants = chat.participants.filter(
      (participantId) => !participantId.equals(userId),
    );
    return chat.save();
  }

  async addParticipant(chatId: string, userId: string, currentUserId: string) {
    const chat = await this.chatModel.findById(chatId);

    if (!chat) {
      this.handleError('Chat not found', HttpStatus.NOT_FOUND);
    }

    if (!chat.admins.some((adminId) => adminId.equals(currentUserId))) {
      this.handleError(
        'You are not the creator or an admin',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user is already an admin
    if (
      chat.participants.some((participantId) => participantId.equals(userId))
    ) {
      this.handleError('User is already an participant', HttpStatus.FORBIDDEN);
    }

    chat.participants.push(new Types.ObjectId(userId));
    return chat.save();
  }

  async updateChatName(
    chatId: string,
    chatName: string,
    currentUserId: string,
  ) {
    const chat = await this.chatModel.findOne({
      _id: chatId,
      admins: { $in: [new Types.ObjectId(currentUserId)] },
    });
    if (!chat) {
      this.handleError('Chat not found', HttpStatus.NOT_FOUND);
    }
    chat.chatName = chatName;
    return chat.save();
  }
}
