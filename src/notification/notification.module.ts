import { Module } from '@nestjs/common';
import { NotificationResolver } from './notification.resolver';
import { NotificationService } from './notification.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import {
  Notification,
  NotificationSchema,
} from 'src/schemas/notification.schema';
import { AuthModule } from 'src/auth/auth.module';
import { SharedModule } from 'src/Shared/shared.module';
import { NotificationController } from './notification.controller';
import { SharedService } from 'src/Shared/shared.service';

@Module({
  imports: [
    AuthModule,
    SharedModule,
    SharedModule.registerRmq('NOTIFICATION_SERVICE', 'NOTIFICATION'),

    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [
    NotificationResolver,
    NotificationService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
  exports: [NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}
