import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { HttpStatusCode } from 'axios';
import { GraphQLError } from 'graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';
import { PUB_SUB } from 'src/modules/pubSub.module';
import {
  Content,
  Notification,
  NotificationDocument,
  NotificationType,
} from 'src/schemas/notification.schema';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
    @Inject('NOTIFICATION_SERVICE') private readonly client: ClientProxy,
  ) {}
  // async onModuleInit() {
  //   console.log('NotificationService bağlı');
  //   this.client.emit('test_connection', { message: 'Connection is working' });
  // }
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
  async createNotification({
    recipientId,
    senderId,
    type,
    content,
    contentType,
    message,
  }: {
    recipientId: string;
    senderId: string;
    type: NotificationType;
    content: typeof Content;
    contentType: string;
    message: string;
  }) {
    const sender = await this.userModel
      .findById(senderId)
      .select('userName _id profilePhoto');
    const recipient = await this.userModel
      .findById(recipientId)
      .select('status');

    if (!sender || !recipient) {
      this.handleError('User not Found', HttpStatus.NOT_FOUND);
    }

    if (
      recipient.status == 'online' &&
      type == NotificationType.DIRECT_MESSAGE
    ) {
      return null;
    }
    const newNotification = new this.notificationModel({
      recipient: recipientId,
      sender: senderId,
      type,
      content: content._id,
      contentType,
      message,
      isRead: false,
    });
    const savedNotification = await newNotification.save();

    this.pubSub.publish('newNotification', {
      newNotification: {
        recipient: recipientId,
        type,
        content: {
          ...content,
          // __typename: contentType,
        },
        sender,
        _id: savedNotification._id,
        message,
        isRead: false,
        contentType,
      },
    });

    return savedNotification;
  }
}
