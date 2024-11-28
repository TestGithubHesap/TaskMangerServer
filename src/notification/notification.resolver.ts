import {
  BadRequestException,
  Inject,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { NotificationService } from './notification.service';
import { PUB_SUB } from 'src/modules/pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Notification } from 'src/schemas/notification.schema';

@Resolver('Notification')
@UseInterceptors(GraphQLErrorInterceptor)
export class NotificationResolver {
  constructor(
    private readonly notificationService: NotificationService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}

  @UseGuards(AuthGuard)
  @Subscription(() => Notification, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        throw new BadRequestException();
      }

      return payload.newNotification.recipient.toString() === req.user._id;
    },
  })
  newNotification() {
    return this.pubSub.asyncIterator('newNotification');
  }
}
