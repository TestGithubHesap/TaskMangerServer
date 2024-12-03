import { HttpStatus, Inject, Injectable } from '@nestjs/common';
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
import { PUB_SUB } from 'src/modules/pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { GetChatMessagesInput } from './dto/GetChatMessagesInput';
import {
  MediaContent,
  MediaContentDocument,
} from 'src/schemas/mediaContent.schema';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/schemas/notification.schema';
import { ObjectType } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(MediaContent.name)
    private mediaContentModel: Model<MediaContentDocument>,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationServiceClient: ClientProxy,
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
        this.chatModel
          .findOne({
            _id: input.chatId,
            participants: { $in: new Types.ObjectId(userId) },
          })
          .populate({
            path: 'participants',
            select: '_id status ',
            model: 'User',
          }),
        this.userModel.findById(userId),
      ]);
      if (!chat || !user) {
        return this.handleError('Chat or user not found', HttpStatus.NOT_FOUND);
      }

      // if (!chat.participants.includes(new Types.ObjectId(user._id))) {
      //   return this.handleError(
      //     'User is not a participant of this chat',
      //     HttpStatus.FORBIDDEN,
      //   );
      // }
      let mediaId: Types.ObjectId | undefined;
      if (input.mediaContent) {
        const newMedia = new this.mediaContentModel({
          type: input.mediaContent.type,
          url: input.mediaContent.url,
          thumbnail: input.mediaContent.thumbnail,
          duration: input.mediaContent.duration,
          size: input.mediaContent.size,
          mimeType: input.mediaContent.mimeType,
        });
        const savedMedia = await newMedia.save();
        mediaId = new Types.ObjectId(savedMedia._id);
      }

      const newMessage = new this.messageModel({
        sender: new Types.ObjectId(userId),
        chat: new Types.ObjectId(input.chatId),
        type: input.type,
        content: input.content,
        media: mediaId, // Eğer medya varsa ID'sini ekle
        isRead: [new Types.ObjectId(userId)], // Gönderen otomatik olarak okumuş sayılır
      });

      await newMessage.save();

      await this.chatModel.findByIdAndUpdate(chat._id, {
        $push: { messages: newMessage._id },
      });
      const messageForPublish = {
        _id: newMessage._id,
        type: newMessage.type,
        content: newMessage.content,
        messageIsReaded: true,
        chatId: chat._id,
        sender: {
          _id: user._id,
          userName: user.userName,
          profilePhoto: user.profilePhoto,
        },
      };
      if (mediaId) {
        const mediaContent = await this.mediaContentModel.findById(mediaId);
        Object.assign(messageForPublish, { media: mediaContent });
      }
      this.pubSub.publish('addMessageToChat', {
        addMessageToChat: messageForPublish,
      });
      const participants = chat.participants as unknown as User[];
      const notificationInput = {
        senderId: user._id,
        recipientIds: participants
          .filter(
            (participant) =>
              participant._id.toString() !== userId.toString() &&
              participant.status !== 'online',
          )
          .map((participant) => participant._id),
        type: NotificationType.DIRECT_MESSAGE,
        content: {
          _id: new Types.ObjectId(user._id),
        },
        contentType: 'User',
        message: `${user.userName} messaj attı`,
      };

      this.notificationEmitEvent('create_notification', notificationInput);

      return newMessage;
    } catch (error) {
      this.handleError(
        'message creation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async getChatMessages(
    userId: string,
    { chatId, page, limit, extraPassValue }: GetChatMessagesInput,
  ) {
    const skip = (page - 1) * limit + extraPassValue;

    const chatMessages = await this.messageModel.aggregate([
      {
        $match: {
          chat: new Types.ObjectId(chatId),
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'sender',
        },
      },
      {
        $unwind: {
          path: '$sender',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'mediacontents',
          localField: 'media',
          foreignField: '_id',
          as: 'media',
        },
      },
      {
        $unwind: {
          path: '$media',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Check if userId exists in the isRead array
        $addFields: {
          messageIsReaded: {
            $cond: {
              if: { $in: [new Types.ObjectId(userId), '$isRead'] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          type: 1,
          'sender.userName': 1,
          'sender.profilePhoto': 1,
          'sender._id': 1,
          'media.type': 1,
          'media.url': 1,
          'media._id': 1,
          messageIsReaded: 1,
        },
      },
    ]);

    const totalMessages = await this.messageModel.countDocuments({
      chat: new Types.ObjectId(chatId),
    });

    const pagination = {
      messages: chatMessages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
    };

    return pagination;
  }

  async markMessagesAsRead(userId: string, messageIds: string[]) {
    const result = await this.messageModel.updateMany(
      {
        _id: { $in: messageIds },
        isRead: { $ne: new Types.ObjectId(userId) }, // Sadece henüz okunmamış mesajları güncelle
      },
      {
        $addToSet: { isRead: new Types.ObjectId(userId) },
      },
    );

    return result.modifiedCount > 0;
  }

  async markChatMessagesAsRead(chatId: string, currentUserId: string) {
    const result = await this.messageModel.updateMany(
      {
        chat: new Types.ObjectId(chatId),
        isRead: {
          $ne: new Types.ObjectId(currentUserId),
        },
      },
      {
        $addToSet: { isRead: new Types.ObjectId(currentUserId) },
      },
    );

    return result.modifiedCount > 0;
  }

  async getMessageReaders(userId: string, messageId: string) {
    try {
      const result = await this.messageModel
        .findOne({
          _id: new Types.ObjectId(messageId),
          sender: new Types.ObjectId(userId),
        })
        .populate({
          path: 'isRead',
          select: '_id userName profilePhoto ',
          model: 'User',
        })
        .select('isRead _id');
      if (!result) {
        this.handleError('Message is not found', HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (error) {
      this.handleError(
        'getMessageReaders  faild',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  private notificationEmitEvent(cmd: string, payload: any) {
    this.notificationServiceClient.emit(cmd, payload);
  }
}
