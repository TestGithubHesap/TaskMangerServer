import { Controller, Inject } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SharedService } from 'src/Shared/shared.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Content, NotificationType } from 'src/schemas/notification.schema';

@Controller()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  @EventPattern('create_notification')
  async handleNotificationCreatedEvent(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      recipientId: string;
      senderId: string;
      type: NotificationType;
      content: typeof Content;
      contentType: string;
      message: string;
    },
  ) {
    try {
      console.log('kuyruk çalıştı');
      await this.notificationService.createNotification(payload);
      this.sharedService.acknowledgeMessage(context);
    } catch (error) {
      console.error('Error processing notification:', error);
      // Hata durumunda bile mesajı acknowledge et
      this.sharedService.acknowledgeMessage(context);
      // Opsiyonel: Hata logu oluştur veya bir hata raporlama servisi kullan
    }
  }
}
