import {
  BadRequestException,
  Inject,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { NotificationService } from './notification.service';
import { PUB_SUB } from 'src/modules/pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Content, Notification } from 'src/schemas/notification.schema';
import { User as UserAuth } from 'src/types/user';
import { CurrentUser } from 'src/common/decorators/user.decorator';

@UseInterceptors(GraphQLErrorInterceptor)
@Resolver(() => Notification)
export class NotificationResolver {
  constructor(
    private readonly notificationService: NotificationService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}

  @Query(() => [Notification])
  @UseGuards(AuthGuard)
  async getNotifications(@CurrentUser() user: UserAuth) {
    const data = await this.notificationService.getNotificationsForUser(
      user._id,
    );

    return data;
  }
  @ResolveField(() => Content, { nullable: true })
  async content(@Parent() notification: Notification) {
    // notification.contentType'dan doğrudan al
    const contentType = notification.contentType;

    const content = notification.content; // contentId'yi al
    // console.log(contentType, content);
    if (!content || !content._id) {
      return null; // Eksik bir içerik varsa null döndür
    }

    switch (contentType) {
      case 'Project': {
        const data = { ...content, __typename: 'Project' };
        return data;
      }

      case 'Task': {
        const data = { ...content, __typename: 'Task' };
        return data;
      }

      case 'Company': {
        const data = { ...content, __typename: 'Company' };
        return data;
      }

      case 'User': {
        const data = { ...content, __typename: 'User' };
     
        return data;
      }

      default:
        return null; // Geçersiz türse null döndür
    }
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async markNotificationAsRead(@Args('notificationId') notificationId: string) {
    return this.notificationService.markAsRead(notificationId);
  }

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
